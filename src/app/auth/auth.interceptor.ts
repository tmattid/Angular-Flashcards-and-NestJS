import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { environment } from '../../environments/environment'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { catchError, switchMap, throwError } from 'rxjs'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router)
  const authService = inject(AuthService)

  // Instead of injecting AuthService, get the token directly from localStorage
  // This avoids the circular dependency
  const token = localStorage.getItem('auth_token')

  // Debug log the request details
  console.log(`Auth Interceptor - Request to ${req.url}`)
  console.log(`Auth token available: ${!!token}`)

  // Only add the token for requests to our API
  let authReq = req
  if (req.url.startsWith(environment.apiUrl) && token) {
    console.log(`Adding auth header to request: ${req.url}`)
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  if (req.url.startsWith(environment.apiUrl) && !token) {
    console.warn(`No auth token available for API request: ${req.url}`)
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 || error.status === 403) {
          console.log('Authentication error intercepted', error)

          // In development mode, we can try auto-login for testing
          if (!environment.production && error.url?.includes('/api/')) {
            // Skip for auth-related endpoints to avoid loops
            if (error.url.includes('/auth/')) {
              return throwError(() => error)
            }

            console.log('Development mode: attempting debug login')
            return authService.debugLogin().pipe(
              switchMap((user) => {
                if (user) {
                  console.log('Debug login successful, retrying request')
                  // Get the fresh token after login
                  const newToken = authService.token()
                  // Clone the original request with the new token
                  const retryReq = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`,
                    },
                  })
                  // Retry the request with the new token
                  return next(retryReq)
                } else {
                  console.error('Debug login failed')
                  handleAuthError(router, authService)
                  return throwError(
                    () => new Error('Authentication required. Please log in.'),
                  )
                }
              }),
              catchError((loginError) => {
                console.error('Auto-login failed', loginError)
                handleAuthError(router, authService)
                return throwError(
                  () => new Error('Authentication required. Please log in.'),
                )
              }),
            )
          } else {
            // In production or for non-API routes, just handle the error
            handleAuthError(router, authService)
          }
        }
      }

      // For other errors, just pass through
      return throwError(() => error)
    }),
  )
}

function handleAuthError(router: Router, authService: AuthService): void {
  // Clear any stored credentials
  localStorage.removeItem('auth_token')

  // Get the current URL to redirect back after login
  const returnUrl = router.url

  // Only navigate if not already on login page
  if (!returnUrl.includes('/login')) {
    // Navigate to login with return URL
    router.navigate(['/login'], {
      queryParams: {
        returnUrl: returnUrl === '/' ? '/dashboard' : returnUrl,
      },
    })
  }
}
