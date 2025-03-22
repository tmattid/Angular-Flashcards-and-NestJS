import { Routes } from '@angular/router'
import { LoginComponent } from './login/login.component'
import { DashboardComponent } from './dashboard/dashboard.component'
import { authGuard } from './auth/auth.guard'
import { AuthCallbackComponent } from './auth/auth-callback/auth-callback.component'

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Dashboard',
    canActivate: [authGuard],
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent,
    title: 'Authentication',
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: 'dashboard' },
]
