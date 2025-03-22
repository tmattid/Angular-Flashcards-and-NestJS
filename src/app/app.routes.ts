import { Routes } from '@angular/router'
import { LoginComponent } from './login/login.component'
import { DashboardComponent } from './dashboard/dashboard.component'
import { inject } from '@angular/core'
import { AuthService } from './services/auth.service'
import { Router, CanActivateFn } from '@angular/router'
import { map, firstValueFrom, timeout, catchError } from 'rxjs'
import { of } from 'rxjs'

// Type-safe auth guard function
const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService)
  const router = inject(Router)

  try {



    await router.navigate(['/login'])
    return false
  } catch (error) {
    console.error('Auth guard error:', error)
    return false
  }
}

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
  },
  {
    path: 'auth/callback',
    component: DashboardComponent,
    title: 'Dashboard',
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
]
