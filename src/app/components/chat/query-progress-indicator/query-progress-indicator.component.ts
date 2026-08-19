import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../core/i18n/services/translation.service';

export interface ProgressStep {
  id: number;
  label: string;
  sublabel: string;
}

@Component({
  selector: 'app-query-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-indicator-card" role="status" aria-live="polite">
      <div class="progress-header">
        <div class="header-left">
          <span class="pulse-beacon"></span>
          <span class="status-title">
            {{ i18n.isRtl() ? 'جاري البحث في قاعدة المعرفة السريرية' : 'Searching Clinical Knowledge Base' }}
          </span>
        </div>
        <span class="step-count">
          {{ i18n.isRtl() ? 'خطوة ' + currentStep + ' من ' + steps.length : 'Step ' + currentStep + ' of ' + steps.length }}
        </span>
      </div>

      <div class="progress-bar-track">
        <div 
          class="progress-bar-fill" 
          [style.width.%]="progressPercentage"
        ></div>
      </div>

      <div class="steps-grid">
        <div 
          *ngFor="let step of steps" 
          class="step-item"
          [class.completed]="currentStep > step.id"
          [class.active]="currentStep === step.id"
          [class.pending]="currentStep < step.id"
        >
          <div class="step-icon">
            <svg *ngIf="currentStep > step.id" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span *ngIf="currentStep <= step.id">{{ step.id }}</span>
          </div>

          <div class="step-text">
            <span class="step-label">{{ step.label }}</span>
            <span class="step-sub">{{ step.sublabel }}</span>
          </div>
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

    .progress-indicator-card {
      background: #ffffff;
      border: 1px solid rgba(18, 21, 26, 0.1);
      border-radius: 16px;
      padding: 1.4rem 1.6rem;
      box-shadow: 0 4px 20px rgba(18, 21, 26, 0.04);
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .pulse-beacon {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--teal, #22c3b6);
      box-shadow: 0 0 10px var(--teal, #22c3b6);
      animation: pulseGlow 1.5s ease-in-out infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.4); opacity: 1; }
    }

    .status-title {
      font-family: var(--font-body, sans-serif);
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--ink, #12151a);
    }

    .step-count {
      font-family: var(--font-mono, monospace);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--teal, #22c3b6);
      background: rgba(34, 195, 182, 0.1);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
    }

    .progress-bar-track {
      height: 6px;
      background: rgba(18, 21, 26, 0.07);
      border-radius: 99px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(to right, var(--teal, #22c3b6), #46ded2);
      border-radius: 99px;
      transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.8rem;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      opacity: 0.45;
      transition: opacity 0.3s ease, transform 0.3s ease;

      &.active {
        opacity: 1;
        transform: translateY(-1px);
        .step-icon {
          background: var(--teal, #22c3b6);
          color: var(--charcoal, #12151a);
          box-shadow: 0 0 10px rgba(34, 195, 182, 0.4);
        }
        .step-label {
          color: var(--ink, #12151a);
          font-weight: 600;
        }
      }

      &.completed {
        opacity: 0.9;
        .step-icon {
          background: rgba(34, 195, 182, 0.18);
          color: var(--teal, #22c3b6);
        }
      }
    }

    .step-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(18, 21, 26, 0.1);
      color: rgba(18, 21, 26, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono, monospace);
      font-size: 0.68rem;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 0.1rem;
      transition: all 0.25s ease;
    }

    .step-text {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .step-label {
      font-family: var(--font-body, sans-serif);
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--ink, #12151a);
      line-height: 1.25;
    }

    .step-sub {
      font-family: var(--font-mono, monospace);
      font-size: 0.65rem;
      color: rgba(18, 21, 26, 0.45);
    }

    @media (max-width: 768px) {
      .steps-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
    }
  `]
})
export class QueryProgressIndicatorComponent {
  @Input() currentStep = 1;

  constructor(public i18n: TranslationService) {}

  get steps(): ProgressStep[] {
    const isAr = this.i18n.isRtl();
    return [
      { id: 1, label: isAr ? 'ترميز السؤال' : 'Query Embedding', sublabel: isAr ? 'المطابقة المتجهية' : 'Vector similarity' },
      { id: 2, label: isAr ? 'استرجاع الأدلة' : 'Evidence Retrieval', sublabel: isAr ? 'إرشادات NICE و WHO' : 'NICE & WHO guidelines' },
      { id: 3, label: isAr ? 'التدقيق والتوثيق' : 'Grounding Audit', sublabel: isAr ? 'فحص منع التخمين' : 'Zero-hallucination check' },
      { id: 4, label: isAr ? 'توليد الإجابة' : 'Synthesizing', sublabel: isAr ? 'صياغة المراجع' : 'Cited response rendering' }
    ];
  }

  get progressPercentage(): number {
    return (this.currentStep / this.steps.length) * 100;
  }
}
