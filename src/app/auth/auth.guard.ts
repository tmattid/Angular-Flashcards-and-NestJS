import { CanActivateFn, Router } from '@angular/router'
import { inject } from '@angular/core'
import { AuthService } from '../services/auth.service'
import { map, take } from 'rxjs/operators'
import { toObservable } from '@angular/core/rxjs-interop'

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return toObservable(authService.isAuthenticated).pipe(
    take(1),
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true
      }

      // Store the attempted URL for redirecting
      const redirectUrl = state.url

      // Navigate to the login page with extras
      router.navigate(['/login'], {
        queryParams: { returnUrl: redirectUrl },
      })

      return false
    }),
  )
}
