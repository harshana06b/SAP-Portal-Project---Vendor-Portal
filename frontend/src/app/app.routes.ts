import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'rfq/:id',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/rfq-detail/rfq-detail').then((m) => m.RfqDetail)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile)
  },
  {
    path: 'financials',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/finance/finance.component').then((m) => m.FinanceComponent)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
