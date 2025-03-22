import { HttpInterceptorFn } from '@angular/common/http'
import { environment } from '../../environments/environment'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get the token from localStorage
  const token = localStorage.getItem('auth_token')

  // Handle both relative and absolute URLs
  const isApiRequest =
    req.url.startsWith(environment.apiUrl) ||
    req.url.startsWith('/api') ||
    req.url.includes('flashcards')

  // Add auth token and correct port for API requests
  if (isApiRequest && token) {
    // Clone the request with adjustments
    let updatedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    })

    // Fix relative URLs to use the correct host
    if (req.url.startsWith('/')) {
      updatedReq = updatedReq.clone({
        url: `http://localhost:3000${req.url}`,
      })
      console.log(`Interceptor fixed URL: ${req.url} → ${updatedReq.url}`)
    }

    return next(updatedReq)
  }

  return next(req)
}
