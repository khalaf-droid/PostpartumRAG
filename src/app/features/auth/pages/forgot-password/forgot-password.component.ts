import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../../../core/i18n/services/translation.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent, TranslatePipe],
  template: `
    <app-auth-shell>
      <div class="forgot-wrapper">
        <header class="forgot-header">
          <h1 class="forgot-title">{{ 'auth.forgot_title' | translate }}</h1>
          <p class="forgot-subhead">
            {{ 'auth.forgot_sub' | translate }}
          </p>
        </header>

        <div *ngIf="isSubmitted" class="auth-alert success" role="alert">
          <svg class="alert-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{{ 'auth.reset_sent_prefix' | translate }} {{ sentEmail }} {{ 'auth.reset_sent_suffix' | translate }}</span>
        </div>

        <form *ngIf="!isSubmitted" [formGroup]="forgotForm" (ngSubmit)="onSubmit()" novalidate class="auth-form">
          <div class="form-group">
            <label for="forgot_email" class="form-label">{{ 'auth.email' | translate }}</label>
            <div class="input-wrapper" [class.is-invalid]="touched && f['email'].errors">
              <input
                id="forgot_email"
                type="email"
                formControlName="email"
                [placeholder]="'auth.placeholder_email' | translate"
                class="form-input"
                autocomplete="email"
              />
            </div>
            <p *ngIf="touched && f['email'].errors?.['required']" class="error-text">
              {{ 'auth.email_required' | translate }}
            </p>
            <p *ngIf="touched && f['email'].errors?.['email'] && !f['email'].errors['required']" class="error-text">
              {{ 'auth.email_invalid' | translate }}
            </p>
          </div>

          <button type="submit" class="btn-submit" [disabled]="isLoading">
            <span *ngIf="!isLoading">{{ 'auth.send_reset_link' | translate }}</span>
            <span *ngIf="isLoading" class="loading-state">
              <span class="btn-spinner"></span>
              {{ 'auth.sending' | translate }}
            </span>
          </button>
        </form>

        <div class="auth-switch-container">
          <a routerLink="/login" class="switch-link">
            <span>{{ i18n.isRtl() ? '→' : '←' }} {{ 'auth.back_to_login' | translate }}</span>
          </a>
        </div>
      </div>
    </app-auth-shell>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .forgot-wrapper { display: flex; flex-direction: column; gap: 1.25rem; }
    .forgot-title {
      font-family: var(--font-display, Georgia, serif);
      font-size: 2rem;
      font-weight: 600;
      color: var(--ink, #12151a);
      letter-spacing: -0.015em;
      margin-bottom: 0.5rem;
    }
    .forgot-subhead {
      font-family: var(--font-body, sans-serif);
      font-size: 0.94rem;
      color: var(--muted-dark, rgba(18, 21, 26, 0.65));
      line-height: 1.5;
      margin: 0;
    }
    .auth-alert.success {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
      background: rgba(34, 195, 182, 0.1);
      border: 1px solid rgba(34, 195, 182, 0.3);
      color: #167a72;
      border-radius: 10px;
      font-size: 0.88rem;
      line-height: 1.4;
    }
    .auth-form { display: flex; flex-direction: column; gap: 1.1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-label { font-size: 0.84rem; font-weight: 600; color: var(--ink, #12151a); }
    .input-wrapper {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(18, 21, 26, 0.16);
      border-radius: 10px;
      &:focus-within { border-color: var(--teal, #22c3b6); box-shadow: 0 0 0 3px rgba(34, 195, 182, 0.25); }
      &.is-invalid { border-color: #b85c57; }
    }
    .form-input {
      width: 100%; padding: 0.8rem 0.95rem; border: none; background: transparent;
      font-size: 0.92rem; color: var(--ink, #12151a); border-radius: 10px;
      &:focus { outline: none; }
    }
    .error-text { font-size: 0.78rem; color: #b85c57; margin: 0.1rem 0 0 0; }
    .btn-submit {
      width: 100%; padding: 0.9rem 1.5rem; background-color: var(--teal, #22c3b6);
      color: var(--charcoal, #12151a); border: none; border-radius: 10px;
      font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem;
      box-shadow: 0 4px 14px rgba(34, 195, 182, 0.22);
      &:hover:not(:disabled) { background-color: #1fb3a7; transform: translateY(-1px); }
      &:disabled { opacity: 0.7; cursor: not-allowed; }
    }
    .loading-state { display: inline-flex; align-items: center; gap: 0.6rem; }
    .btn-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(18, 21, 26, 0.25);
      border-top-color: var(--charcoal, #12151a); border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .auth-switch-container {
      border-top: 1px solid rgba(18, 21, 26, 0.08);
      padding-top: 1.25rem; margin-top: 0.5rem; text-align: center;
    }
    .switch-link {
      font-weight: 600; color: var(--ink, #12151a); text-decoration: none;
      &:hover { color: var(--teal, #22c3b6); }
    }
  `]
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isLoading = false;
  isSubmitted = false;
  touched = false;
  sentEmail = '';

  constructor(
    private fb: FormBuilder,
    public i18n: TranslationService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.forgotForm.controls; }

  onSubmit() {
    this.touched = true;
    if (this.forgotForm.invalid) return;

    this.isLoading = true;
    this.sentEmail = this.forgotForm.value.email;

    setTimeout(() => {
      this.isLoading = false;
      this.isSubmitted = true;
    }, 1000);
  }
}
