import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate.pipe';

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordFieldComponent),
      multi: true
    }
  ],
  template: `
    <div class="field-container">
      <label [for]="fieldId" class="field-label">
        {{ label }}
      </label>

      <div class="input-wrapper" [class.is-invalid]="invalid && touched">
        <input
          [id]="fieldId"
          [type]="showPassword ? 'text' : 'password'"
          [placeholder]="placeholder"
          [value]="value"
          [disabled]="disabled"
          (input)="onInput($event)"
          (blur)="onBlur()"
          class="field-input"
          [attr.aria-invalid]="invalid && touched"
          [attr.aria-describedby]="errorId"
        />

        <button
          type="button"
          class="toggle-btn"
          (click)="toggleVisibility()"
          [attr.aria-label]="showPassword ? ('auth.hide_password' | translate) : ('auth.show_password' | translate)"
          [attr.aria-pressed]="showPassword"
          tabindex="0"
        >
          <!-- Eye icon when hidden -->
          <svg *ngIf="!showPassword" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>

          <!-- Eye Off icon when shown -->
          <svg *ngIf="showPassword" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        </button>
      </div>

      <p *ngIf="invalid && touched && errorMessage" [id]="errorId" class="error-msg">
        {{ errorMessage }}
      </p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .field-container {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .field-label {
      font-family: var(--font-body);
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--ink);
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(18, 21, 26, 0.16);
      border-radius: 10px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:focus-within {
        border-color: var(--teal);
        box-shadow: 0 0 0 3px rgba(34, 195, 182, 0.25);
      }

      &.is-invalid {
        border-color: #b85c57;

        &:focus-within {
          box-shadow: 0 0 0 3px rgba(184, 92, 87, 0.25);
        }
      }
    }
    .field-input {
      width: 100%;
      padding: 0.8rem 2.6rem 0.8rem 0.95rem;
      border: none;
      background: transparent;
      font-family: var(--font-body);
      font-size: 0.92rem;
      color: var(--ink);
      border-radius: 10px;

      &:focus {
        outline: none;
      }

      &::placeholder {
        color: rgba(18, 21, 26, 0.4);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
    .toggle-btn {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: rgba(18, 21, 26, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.3rem;
      border-radius: 6px;
      cursor: pointer;
      transition: color 0.15s ease, background-color 0.15s ease;

      &:hover {
        color: var(--ink);
        background-color: rgba(18, 21, 26, 0.05);
      }

      &:focus-visible {
        outline: none;
        color: var(--teal);
        background-color: rgba(34, 195, 182, 0.12);
      }
    }
    .error-msg {
      font-family: var(--font-body);
      font-size: 0.78rem;
      color: #b85c57;
      margin: 0.1rem 0 0 0;
    }
  `]
})
export class PasswordFieldComponent implements ControlValueAccessor {
  @Input() label = 'Password';
  @Input() placeholder = 'Enter your password';
  @Input() fieldId = 'password_' + Math.random().toString(36).substr(2, 9);
  @Input() invalid = false;
  @Input() touched = false;
  @Input() errorMessage = '';

  errorId = this.fieldId + '_error';
  value = '';
  disabled = false;
  showPassword = false;

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  toggleVisibility() {
    this.showPassword = !this.showPassword;
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }

  onBlur() {
    this.onTouched();
  }

  writeValue(val: string): void {
    this.value = val || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
