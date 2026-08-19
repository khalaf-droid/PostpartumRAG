import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate.pipe';

@Component({
  selector: 'app-auth-brand',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-brand" [class.centered]="centered">
      <a routerLink="/" class="brand-link">
        <span class="dot"></span>
        <span class="brand-name">PostpartumRAG</span>
      </a>
      <p class="tagline">{{ 'workspace.tagline' | translate }}</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .auth-brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;

      &.centered {
        align-items: center;
        text-align: center;
      }
    }
    .brand-link {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.45rem;
      letter-spacing: -0.015em;
      color: var(--ink);
      transition: opacity 0.2s ease;

      &:hover {
        opacity: 0.85;
      }
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--teal);
      display: inline-block;
      box-shadow: 0 0 10px rgba(34, 195, 182, 0.5);
    }
    .tagline {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--teal);
      font-weight: 500;
      margin: 0;
    }
  `]
})
export class AuthBrandComponent {
  @Input() centered = false;
}
