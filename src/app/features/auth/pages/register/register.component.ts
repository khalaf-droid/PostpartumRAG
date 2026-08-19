import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { PasswordFieldComponent } from '../../components/password-field/password-field.component';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../../../core/i18n/services/translation.service';

export type PasswordStrength = 'none' | 'weak' | 'fair' | 'strong';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    PasswordFieldComponent,
    TranslatePipe
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public i18n: TranslationService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  get f() {
    return this.registerForm.controls;
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get passwordStrength(): PasswordStrength {
    const val = this.registerForm.get('password')?.value || '';
    if (!val) return 'none';
    if (val.length < 8) return 'weak';
    if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) return 'strong';
    return 'fair';
  }

  get passwordStrengthLabel(): string {
    const isAr = this.i18n.isRtl();
    switch (this.passwordStrength) {
      case 'weak': return isAr ? 'ضعيفة' : 'Weak';
      case 'fair': return isAr ? 'متوسطة' : 'Fair';
      case 'strong': return isAr ? 'قوية' : 'Strong';
      default: return '';
    }
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = null;

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { fullName, email, password } = this.registerForm.value;

    this.authService.register({ fullName, email, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'success' || res.token) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = this.i18n.isRtl() ? 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.' : 'Registration failed. Please try again.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || (this.i18n.isRtl() ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
      }
    });
  }
}
