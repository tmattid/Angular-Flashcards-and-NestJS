import { HttpInterceptorFn } from '@angular/common/http'
import { environment } from '../../environments/environment'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Instead of injecting AuthService, get the token directly from localStorage
  // This avoids the circular dependency
  const token = localStorage.getItem('auth_token')

  // Only add the token for requests to our API
  if (req.url.startsWith(environment.apiUrl) && token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    return next(authReq)
  }

  return next(req)
}
