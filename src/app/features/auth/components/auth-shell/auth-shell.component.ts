import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthBrandComponent } from '../auth-brand/auth-brand.component';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate.pipe';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, AuthBrandComponent, TranslatePipe],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss'
})
export class AuthShellComponent {}
