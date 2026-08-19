import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../core/i18n/services/translation.service';

export type ErrorType = 
  | 'QUERY_OUTSIDE_SCOPE' 
  | 'NO_EVIDENCE_FOUND' 
  | 'RATE_LIMITED' 
  | 'SERVICE_UNAVAILABLE' 
  | 'HALLUCINATION_RISK';

export interface ErrorConfig {
  title: string;
  description: string;
  icon: 'scope' | 'evidence' | 'time' | 'server' | 'shield';
  actionLabel?: string;
  secondaryActionLabel?: string;
}

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-display-card" [class]="type" role="alert" aria-live="assertive">
      <div class="error-icon-wrapper">
        <!-- Outside Scope Icon -->
        <svg *ngIf="config.icon === 'scope'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4m0 4h.01"></path>
        </svg>

        <!-- No Evidence Icon -->
        <svg *ngIf="config.icon === 'evidence'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>

        <!-- Rate Limited Icon -->
        <svg *ngIf="config.icon === 'time'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>

        <!-- Service Unavailable Icon -->
        <svg *ngIf="config.icon === 'server'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
        </svg>

        <!-- Hallucination Shield Icon -->
        <svg *ngIf="config.icon === 'shield'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>

      <div class="error-content">
        <h4 class="error-title">{{ config.title }}</h4>
        <p class="error-description">{{ config.description }}</p>

        <div class="error-actions">
          <button 
            *ngIf="config.actionLabel" 
            type="button" 
            class="btn-action primary" 
            [disabled]="disablePrimary"
            (click)="onPrimaryAction()"
          >
            {{ primaryActionLabelOverride || config.actionLabel }}
          </button>
          
          <button 
            *ngIf="config.secondaryActionLabel" 
            type="button" 
            class="btn-action secondary" 
            (click)="onSecondaryAction()"
          >
            {{ config.secondaryActionLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin: 1.5rem 0;
    }

    .error-display-card {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      padding: 1.5rem;
      border-radius: 16px;
      border: 1px solid rgba(18, 21, 26, 0.1);
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(18, 21, 26, 0.04);
      transition: all 0.25s ease;

      &.QUERY_OUTSIDE_SCOPE {
        border-color: rgba(232, 200, 122, 0.4);
        background: rgba(254, 252, 246, 0.9);
        .error-icon-wrapper { color: #d49c2a; background: rgba(232, 200, 122, 0.2); }
      }

      &.NO_EVIDENCE_FOUND, &.HALLUCINATION_RISK {
        border-color: rgba(196, 90, 90, 0.35);
        background: rgba(253, 246, 246, 0.9);
        .error-icon-wrapper { color: #a94442; background: rgba(196, 90, 90, 0.12); }
      }

      &.RATE_LIMITED {
        border-color: rgba(34, 195, 182, 0.35);
        background: rgba(244, 253, 252, 0.9);
        .error-icon-wrapper { color: #1fb3a7; background: rgba(34, 195, 182, 0.18); }
      }

      &.SERVICE_UNAVAILABLE {
        border-color: rgba(184, 92, 87, 0.35);
        background: rgba(253, 245, 245, 0.9);
        .error-icon-wrapper { color: #b85c57; background: rgba(184, 92, 87, 0.18); }
      }
    }

    .error-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .error-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .error-title {
      font-family: var(--font-display, Georgia, serif);
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--ink, #12151a);
      margin: 0;
    }

    .error-description {
      font-family: var(--font-body, sans-serif);
      font-size: 0.9rem;
      color: rgba(18, 21, 26, 0.75);
      line-height: 1.55;
      margin: 0;
    }

    .error-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.6rem;
      flex-wrap: wrap;
    }

    .btn-action {
      font-family: var(--font-body, sans-serif);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &.primary {
        background: var(--accent-teal, #2FD4C4);
        color: #12151a;
        border: none;

        &:hover {
          opacity: 0.9;
        }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &.secondary {
        background: transparent;
        color: var(--ink, #12151a);
        border: 1px solid rgba(18, 21, 26, 0.2);

        &:hover {
          background: rgba(18, 21, 26, 0.05);
        }
      }
    }
  `]
})
export class ErrorDisplayComponent {
  @Input() type: ErrorType = 'NO_EVIDENCE_FOUND';
  @Input() customDescription?: string;
  @Input() disablePrimary: boolean = false;
  @Input() primaryActionLabelOverride?: string;

  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  constructor(public i18n: TranslationService) {}

  get config(): ErrorConfig {
    const isAr = this.i18n.isRtl();
    
    const configs: Record<ErrorType, ErrorConfig> = {
      QUERY_OUTSIDE_SCOPE: {
        title: isAr ? 'استعلام خارج التخصص السريري' : 'Query Outside Clinical Scope',
        description: isAr 
          ? 'نظام PostpartumRAG مخصص حصرياً لإرشادات الصحة النفسية للأمهات بعد الولادة (مثل اكتئاب ما بعد الولادة، الذهان، وسلامة الأدوية أثناء الرضاعة). يرجى طرح سؤال سريري متخصص.'
          : 'PostpartumRAG is exclusively calibrated for maternal postpartum mental health guidance (PND, psychosis, medication safety during lactation). Please ask a relevant clinical query.',
        icon: 'scope',
        actionLabel: isAr ? 'إعادة صياغة السؤال' : 'Rephrase Question',
        secondaryActionLabel: isAr ? 'استكشاف الأدلة' : 'Explore Evidence Scope'
      },
      NO_EVIDENCE_FOUND: {
        title: isAr ? 'لم يتم العثور على دليل مباشر' : 'No Direct Evidence Found',
        description: isAr
          ? 'لم يعثر محرك استرجاع الأدلة على فقرات مطابقة عالية الثقة في إرشادات NICE أو WHO أو BAP لطلبك المحدد.'
          : 'Our evidence retrieval engine could not locate sufficiently high-confidence passage matches in NICE, WHO, or BAP clinical guidelines for this specific query.',
        icon: 'evidence',
        actionLabel: isAr ? 'إعادة صياغة السؤال' : 'Rephrase Question',
        secondaryActionLabel: isAr ? 'تصفح مكتبة الأدلة' : 'Explore Evidence Library'
      },
      RATE_LIMITED: {
        title: isAr ? 'تم الوصول للحد الأقصى للاستعلامات' : 'Query Limit Reached',
        description: isAr
          ? 'للحفاظ على السلامة السريرية واستقرار المحرك، يرجى الانتظار بضع ثوانٍ قبل إرسال سؤالك التالي.'
          : 'To maintain clinical safety and engine stability, please wait a few seconds before submitting your next evidence query.',
        icon: 'time',
        actionLabel: isAr ? 'حاول الآن' : 'Try Again Now'
      },
      SERVICE_UNAVAILABLE: {
        title: isAr ? 'قاعدة المعرفة السريرية غير متاحة' : 'Clinical Knowledge Base Unavailable',
        description: isAr
          ? 'تعذر الاتصال بقاعدة بيانات الأدلة. يرجى التحقق من اتصالك بالإنترنت أو المحاولة بعد لحظات.'
          : 'Unable to reach the evidence database or local vector store. Please verify your connection or try again in a few moments.',
        icon: 'server',
        actionLabel: isAr ? 'إعادة المحاولة' : 'Retry Query'
      },
      HALLUCINATION_RISK: {
        title: isAr ? 'رفض الاستجابة (سياسة عدم التخمين)' : 'Strict Grounding Refusal (Zero-Hallucination Policy)',
        description: isAr
          ? 'تم حجب الإجابة لأن الأدلة المسترجعة لم تستوفِ حد التحقق الكامل 100%. لا يقدم PostpartumRAG أبداً إرشادات غير موثقة.'
          : 'The answer was suppressed because retrieved evidence did not meet our 100% verification threshold. PostpartumRAG never generates unverified clinical guidance.',
        icon: 'shield',
        actionLabel: isAr ? 'عرض الموضوعات الموثقة' : 'View Verified Topics'
      }
    };

    const base = configs[this.type] || configs['NO_EVIDENCE_FOUND'];
    if (this.customDescription) {
      return { ...base, description: this.customDescription };
    }
    return base;
  }

  onPrimaryAction() {
    this.primaryAction.emit();
  }

  onSecondaryAction() {
    this.secondaryAction.emit();
  }
}
