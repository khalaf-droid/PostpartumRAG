import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { PasswordFieldComponent } from '../../components/password-field/password-field.component';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../../../core/i18n/services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    PasswordFieldComponent,
    TranslatePipe
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public i18n: TranslationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = null;

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'success' || res.token) {
          this.router.navigate(['/']);
        } else {
          this.errorMessage = this.i18n.isRtl() 
            ? 'تعذر تسجيل الدخول ببيانات الاعتماد المدخلة.' 
            : 'We couldn\'t sign you in with those credentials.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || (this.i18n.isRtl() 
          ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' 
          : 'Something went wrong. Please try again.');
      }
    });
  }
}
