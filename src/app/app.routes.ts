import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { ChatComponent } from './components/chat/chat.component';

import { authGuard } from './features/auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent) 
  },
  { 
    path: 'forgot-password', 
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) 
  },
  { path: 'workspace', component: ChatComponent, canActivate: [authGuard] },
  { 
    path: 'evidence', 
    loadComponent: () => import('./features/evidence-library/pages/evidence-library.component').then(m => m.EvidenceLibraryComponent) 
  },
  { 
    path: 'evidence/:sourceId', 
    loadComponent: () => import('./features/evidence-library/pages/evidence-source-detail.component').then(m => m.EvidenceSourceDetailComponent) 
  },
  { path: '**', redirectTo: '' }
];
