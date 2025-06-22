import { Routes } from '@angular/router'
import { LoginComponent } from './login/login.component'
import { authGuard } from './auth/auth.guard'
import { AuthCallbackComponent } from './auth/auth-callback/auth-callback.component'
import { FlashcardGridComponent } from './dashboard/grid/flashcard-grid.component'

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login',
  },
  {
    path: 'dashboard',
    component: FlashcardGridComponent,
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
