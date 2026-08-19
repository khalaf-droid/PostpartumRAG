import {
  Component,
  signal,
  computed,
  ElementRef,
  ViewChild,
  HostListener,
  Inject,
  PLATFORM_ID,
  OnInit,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitationCardComponent } from '../citation-card/citation-card.component';
import { ErrorDisplayComponent, ErrorType } from './error-display/error-display.component';
import { QueryProgressIndicatorComponent } from './query-progress-indicator/query-progress-indicator.component';
import { RagService } from '../../services/rag.service';
import { RateLimitService } from '../../services/rate-limit.service';
import { TranslatePipe } from '../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/services/translation.service';
import {
  RagQueryResponse,
  EvidenceSource,
} from '../../models/rag.model';
import { AuthService } from '../../features/auth/services/auth.service';
import { Router } from '@angular/router';

export type TurnStatus = 'loading' | 'success' | 'error';

export interface TextSegment {
  text: string;
  isCitation: boolean;
  citationIndex?: number;
}

export interface ConversationTurn {
  id: string;
  question: string;
  timestamp: number;
  status: TurnStatus;
  response?: RagQueryResponse;
  currentText: string;
  segments: TextSegment[];
  isTyping: boolean;
  errorType?: ErrorType;
  customErrorMessage?: string;
  loadingStep: number;
  retryCount?: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CitationCardComponent,
    ErrorDisplayComponent,
    QueryProgressIndicatorComponent,
    TranslatePipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {
  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLDivElement>;

  draft = signal('');
  conversation = signal<ConversationTurn[]>([]);
  
  // Interactive citation tracking
  highlightedSourceIndex = signal<number | null>(null);
  selectedDrawerSource = signal<EvidenceSource | null>(null);

  // Copy & Toast notification feedback
  toastMessage = signal<string | null>(null);

  // Sessions state
  sessions = signal<any[]>([]);
  activeSessionId = signal<string | null>(null);

  isMobileSidebarOpen = signal(false);

  get currentUser() { return this.auth.currentUser; }
  
  get userInitials() {
     const user = this.currentUser();
     if (!user || !user.fullName) return '';
     const parts = user.fullName.split(' ');
     if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
     return user.fullName.substring(0, 2).toUpperCase();
  }

  get suggestions(): string[] {
    if (this.i18n.isRtl()) {
      return [
        'ما هي العلامات التحذيرية لذهان ما بعد الولادة؟',
        'كيف يختلف اكتئاب ما بعد الولادة عن الحزن النفاسي (Baby Blues)؟',
        'هل استخدام مضادات الاكتئاب آمن أثناء الرضاعة الطبيعية؟'
      ];
    }
    return [
      'What are the warning signs of postpartum psychosis?',
      'How is postnatal depression different from the baby blues?',
      'Is it safe to take antidepressants while breastfeeding?',
    ];
  }

  constructor(
    private rag: RagService,
    public rateLimit: RateLimitService,
    public i18n: TranslationService,
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSessions();
    }
  }

  async loadSessions() {
    const list = await this.rag.getSessions();
    this.sessions.set(list);
  }

  toggleSidebar() {
    this.isMobileSidebarOpen.update(v => !v);
  }

  newSession() {
    this.activeSessionId.set(null);
    this.conversation.set([]);
    this.draft.set('');
  }

  async loadSession(sessionId: string) {
    this.activeSessionId.set(sessionId);
    this.conversation.set([]);
    const messages = await this.rag.getSessionMessages(sessionId);
    
    const turns: ConversationTurn[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
         const turn: ConversationTurn = {
           id: messages[i]._id,
           question: messages[i].content,
           timestamp: new Date(messages[i].createdAt).getTime(),
           status: 'success',
           currentText: '',
           segments: [],
           isTyping: false,
           loadingStep: 4
         };
         if (i + 1 < messages.length && messages[i+1].role === 'assistant') {
            const ast = messages[i+1];
            const sources = (ast.evidence || []).map((e: any, idx: number) => ({
              id: e.documentId || `src-${idx+1}`,
              documentName: e.title,
              sectionTitle: e.section,
              pageNumber: e.page,
              excerpt: e.excerpt,
              sourceUrl: e.sourceUrl
            }));
            turn.response = { answer: ast.content, sources, confidence: 'high' };
            turn.segments = this.parseAnswerSegments(ast.content);
            i++;
         }
         turns.push(turn);
      }
    }
    this.conversation.set(turns);
    this.scrollToBottom();
  }

  async deleteSession(sessionId: string) {
    const success = await this.rag.deleteSession(sessionId);
    if (success) {
      if (this.activeSessionId() === sessionId) {
         this.newSession();
      }
      this.loadSessions();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeDrawer();
  }

  useSuggestion(text: string) {
    this.draft.set(text);
    this.ask();
  }

  isChatLoading = computed(() => {
    const conv = this.conversation();
    if (conv.length === 0) return false;
    return conv[conv.length - 1].status === 'loading';
  });

  async ask() {
    const question = this.draft().trim();
    if (!question || this.isChatLoading()) return;

    if (!this.rateLimit.canSubmit()) {
      const errorTurn: ConversationTurn = {
        id: 'turn-' + Date.now(),
        question,
        timestamp: Date.now(),
        status: 'error',
        currentText: '',
        segments: [],
        isTyping: false,
        loadingStep: 1,
        errorType: 'RATE_LIMITED',
        customErrorMessage: this.i18n.isRtl()
          ? `يرجى الانتظار ${this.rateLimit.cooldownRemainingSeconds()} ثوانٍ قبل إرسال استعلام آخر.`
          : `Please wait ${this.rateLimit.cooldownRemainingSeconds()}s before submitting another query.`
      };
      this.conversation.update(prev => [...prev, errorTurn]);
      this.scrollToBottom();
      return;
    }

    this.rateLimit.recordQuery();
    this.draft.set('');
    this.highlightedSourceIndex.set(null);
    this.selectedDrawerSource.set(null);

    const turnId = 'turn-' + Date.now();
    const newTurn: ConversationTurn = {
      id: turnId,
      question,
      timestamp: Date.now(),
      status: 'loading',
      currentText: '',
      segments: [],
      isTyping: false,
      loadingStep: 1
    };
    
    this.conversation.update(prev => [...prev, newTurn]);
    this.scrollToBottom();

    const stepTimer = setInterval(() => {
      this.conversation.update(prev => {
        return prev.map(t => {
          if (t.id === turnId && t.status === 'loading') {
            return { ...t, loadingStep: t.loadingStep < 4 ? t.loadingStep + 1 : t.loadingStep };
          }
          return t;
        });
      });
    }, 320);

    try {
      const response = await this.rag.query(question, this.activeSessionId() || undefined);
      clearInterval(stepTimer);

      if ((response as any).sessionId && !this.activeSessionId()) {
        this.activeSessionId.set((response as any).sessionId);
        this.loadSessions();
      }

      if (response.answer) {
        this.conversation.update(prev => prev.map(t => 
          t.id === turnId ? { ...t, status: 'success', response, isTyping: true } : t
        ));
        await this.streamAnswer(turnId, response.answer);
      } else {
        this.conversation.update(prev => prev.map(t => 
          t.id === turnId ? { ...t, status: 'error', response, errorType: 'NO_EVIDENCE_FOUND' } : t
        ));
      }
    } catch (e: any) {
      clearInterval(stepTimer);
      const backendError = e.error?.message || e.error?.stack || e.message;
      this.conversation.update(prev => prev.map(t => 
        t.id === turnId ? { ...t, status: 'error', errorType: 'SERVICE_UNAVAILABLE', customErrorMessage: backendError } : t
      ));
    }
    this.scrollToBottom();
  }

  onErrorPrimaryAction(turn: ConversationTurn) {
    if (turn.errorType === 'SERVICE_UNAVAILABLE' || turn.errorType === 'RATE_LIMITED') {
      const retries = turn.retryCount || 0;
      if (retries >= 2) return;
      
      this.conversation.update(prev => prev.map(t => {
        if (t.id === turn.id) {
          return { ...t, status: 'loading', loadingStep: 1, retryCount: retries + 1, errorType: undefined, customErrorMessage: undefined };
        }
        return t;
      }));
      this.resubmitQuery(turn.id, turn.question);
    } else if (turn.errorType === 'QUERY_OUTSIDE_SCOPE' || turn.errorType === 'NO_EVIDENCE_FOUND') {
      this.draft.set(turn.question);
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          const input = this.el.nativeElement.querySelector('.composer input') as HTMLInputElement;
          if (input) input.focus();
        }, 50);
      }
    } else if (turn.errorType === 'HALLUCINATION_RISK') {
      this.router.navigate(['/evidence']);
    }
  }

  onErrorSecondaryAction(turn: ConversationTurn) {
    this.router.navigate(['/evidence']);
  }

  async resubmitQuery(turnId: string, question: string) {
    const stepTimer = setInterval(() => {
      this.conversation.update(prev => {
        return prev.map(t => {
          if (t.id === turnId && t.status === 'loading') {
            return { ...t, loadingStep: t.loadingStep < 4 ? t.loadingStep + 1 : t.loadingStep };
          }
          return t;
        });
      });
    }, 320);

    try {
      const response = await this.rag.query(question, this.activeSessionId() || undefined);
      clearInterval(stepTimer);

      if ((response as any).sessionId && !this.activeSessionId()) {
        this.activeSessionId.set((response as any).sessionId);
        this.loadSessions();
      }

      if (response.answer) {
        this.conversation.update(prev => prev.map(t => 
          t.id === turnId ? { ...t, status: 'success', response, isTyping: true } : t
        ));
        await this.streamAnswer(turnId, response.answer);
      } else {
        this.conversation.update(prev => prev.map(t => 
          t.id === turnId ? { ...t, status: 'error', response, errorType: 'NO_EVIDENCE_FOUND' } : t
        ));
      }
    } catch (e: any) {
      clearInterval(stepTimer);
      const backendError = e.error?.message || e.error?.stack || e.message;
      this.conversation.update(prev => prev.map(t => 
        t.id === turnId ? { ...t, status: 'error', errorType: 'SERVICE_UNAVAILABLE', customErrorMessage: backendError } : t
      ));
    }
    this.scrollToBottom();
  }

  private async streamAnswer(turnId: string, fullText: string): Promise<void> {
    const words = fullText.split(' ');
    let current = '';
    for (const word of words) {
      current += (current ? ' ' : '') + word;
      this.conversation.update(prev => prev.map(t => {
        if (t.id === turnId) {
          return { ...t, currentText: current, segments: this.parseAnswerSegments(current) };
        }
        return t;
      }));
      this.scrollToBottom();
      await new Promise((res) => setTimeout(res, 22));
    }
    this.conversation.update(prev => prev.map(t => 
      t.id === turnId ? { ...t, isTyping: false } : t
    ));
  }

  selectCitation(index: number, turnId: string) {
    this.highlightedSourceIndex.set(index);
    if (isPlatformBrowser(this.platformId)) {
      const cardEl = this.el.nativeElement.querySelector(`#src-${turnId}-${index}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  openDrawer(source: EvidenceSource) {
    this.selectedDrawerSource.set(source);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeDrawer() {
    this.selectedDrawerSource.set(null);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  copyAnswer(turn: ConversationTurn) {
    if (!turn.response || !turn.response.answer) return;
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      navigator.clipboard.writeText(turn.response.answer).then(() => {
        this.showToast(this.i18n.translate('workspace.copied_toast'));
      });
    }
  }

  exportMarkdown(turn: ConversationTurn) {
    if (!turn.response || !turn.response.answer) return;
    const q = turn.question;
    const isAr = this.i18n.isRtl();
    let md = `# ${isAr ? 'السؤال السريري' : 'Clinical Query'}: ${q}\n\n`;
    md += `## ${isAr ? 'الإجابة المبنية على الأدلة' : 'Evidence-Grounded Answer'}\n${turn.response.answer}\n\n`;
    md += `## ${isAr ? 'المصادر والأدلة' : 'Evidence Sources'}\n`;
    turn.response.sources?.forEach((src, idx) => {
      const doc = src.documentName || src.document_name;
      const sec = src.sectionTitle || src.section_title;
      const pg = src.pageNumber || src.page_number;
      md += `\n### [${idx + 1}] ${doc} - ${sec} (${isAr ? 'صفحة' : 'Page'} ${pg})\n`;
      if (src.excerpt) md += `> "${src.excerpt}"\n`;
    });

    if (isPlatformBrowser(this.platformId)) {
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postpartum_rag_evidence_${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast(this.i18n.translate('workspace.exported_toast'));
    }
  }

  private showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 2800);
  }

  private scrollToBottom() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        if (this.scrollAnchor?.nativeElement) {
          this.scrollAnchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 50);
    }
  }

  private parseAnswerSegments(answerText: string): TextSegment[] {
    const regex = /\[(\d+)\]/g;
    const segments: TextSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(answerText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: answerText.substring(lastIndex, match.index),
          isCitation: false,
        });
      }
      const citationNum = parseInt(match[1], 10);
      segments.push({
        text: match[0],
        isCitation: true,
        citationIndex: citationNum,
      });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < answerText.length) {
      segments.push({
        text: answerText.substring(lastIndex),
        isCitation: false,
      });
    }
    return segments;
  }
}
