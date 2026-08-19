import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-divider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-divider">
      <span class="line"></span>
      <span class="text">{{ text }}</span>
      <span class="line"></span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin: 1.3rem 0;
    }
    .auth-divider {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
    }
    .line {
      flex: 1;
      height: 1px;
      background: rgba(18, 21, 26, 0.12);
    }
    .text {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(18, 21, 26, 0.45);
      font-weight: 500;
    }
  `]
})
export class AuthDividerComponent {
  @Input() text = 'OR';
}
