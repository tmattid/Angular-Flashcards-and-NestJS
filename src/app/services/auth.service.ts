import {
  Injectable,
  Signal,
  computed,
  signal,
  inject,
  NgZone,
} from '@angular/core'
import { Router } from '@angular/router'
import { HttpClient } from '@angular/common/http'
import { Observable, of, throwError } from 'rxjs'
import { catchError, map, switchMap, tap } from 'rxjs/operators'
import { toObservable } from '@angular/core/rxjs-interop'
import { environment } from '../../environments/environment'

// Backend API URL - we need to handle different possible configurations
const API_URL = environment.apiUrl
// Get the base URL (without /api) in case the auth routes are not prefixed
const BASE_URL = API_URL.replace(/\/api$/, '')

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  profilePicture?: string
}

export interface AuthTokenResponse {
  access_token: string
  user: UserProfile
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSignal = signal<UserProfile | null>(null)
  private tokenSignal = signal<string | null>(null)
  private initializedSignal = signal<boolean>(false)
  private http = inject(HttpClient)
  private ngZone = inject(NgZone)

  readonly user: Signal<UserProfile | null> = computed(() => this.userSignal())
  readonly token: Signal<string | null> = computed(() => this.tokenSignal())
  readonly isAuthenticated: Signal<boolean> = computed(
    () => !!this.tokenSignal(),
  )

  constructor(private router: Router) {
    this.initializeAuth()
    this.setupAuthMessageListener()
  }

  private initializeAuth(): void {
    // Check for token in localStorage
    const storedToken = localStorage.getItem('auth_token')

    if (storedToken) {
      this.tokenSignal.set(storedToken)
      // Fetch the user profile with the token
      this.getCurrentUser().subscribe({
        next: (profile) => {
          this.userSignal.set(profile)
          this.initializedSignal.set(true)

          // If we have a valid session and we're on the login page, navigate to dashboard
          if (profile && window.location.pathname === '/login') {
            this.router.navigate(['/dashboard'])
          }
        },
        error: () => {
          // Invalid token, clear it
          this.logout().subscribe()
          this.initializedSignal.set(true)
        },
      })
    } else {
      this.initializedSignal.set(true)
    }
  }

  private setupAuthMessageListener(): void {
    // Listen for messages from the popup window
    window.addEventListener('message', (event) => {
      // Verify the origin of the message for security
      if (event.origin !== window.location.origin) {
        return
      }

      const data = event.data
      if (data?.type === 'AUTH_SUCCESS') {
        // Run inside NgZone to ensure Angular detects the changes
        this.ngZone.run(() => {
          console.log('Auth successful, navigating to dashboard')
          // Navigate to dashboard or specified return URL
          this.router.navigate([data.returnUrl || '/dashboard'])
        })
      }
    })
  }

  getCurrentUser(): Observable<UserProfile | null> {
    if (!this.tokenSignal()) {
      return of(null)
    }

    return this.http.get<UserProfile>(`${API_URL}/auth/profile`).pipe(
      catchError((error) => {
        console.error('Error getting current user:', error)
        // If we get a 401 Unauthorized, the token is invalid
        if (error.status === 401) {
          this.tokenSignal.set(null)
          localStorage.removeItem('auth_token')
        }
        return of(null)
      }),
    )
  }

  signInWithGoogle(callbackParams: string = ''): Observable<void> {
    // Use the API URL with the global prefix
    let googleAuthUrl = `${API_URL}/auth/google`

    // If there are callback params, add them as state parameter for the backend to retrieve
    if (callbackParams) {
      // Extract returnUrl from callbackParams
      const returnUrlMatch = callbackParams.match(/returnUrl=([^&]+)/)
      if (returnUrlMatch && returnUrlMatch[1]) {
        const returnUrl = decodeURIComponent(returnUrlMatch[1])
        // Store the return URL in localStorage
        localStorage.setItem('returnUrl', returnUrl)
        // Append state parameter with returnUrl for the OAuth flow
        googleAuthUrl += `?state=${encodeURIComponent(returnUrl)}`
      }
    }

    console.log('Redirecting to Google OAuth URL:', googleAuthUrl)

    // Instead of opening a popup, redirect the current window
    window.location.href = googleAuthUrl

    // Return an empty observable
    return of(void 0)
  }

  // Call this method in your auth callback component
  handleAuthCallback(token: string): Observable<void> {
    if (!token) {
      return throwError(() => new Error('No token provided'))
    }

    // Store the token
    localStorage.setItem('auth_token', token)
    this.tokenSignal.set(token)

    // Get any stored return URL
    const returnUrl = localStorage.getItem('returnUrl') || '/dashboard'

    // Clean up any stored return URL
    localStorage.removeItem('returnUrl')

    // Get user profile
    return this.getCurrentUser().pipe(
      tap((profile) => {
        if (profile) {
          this.userSignal.set(profile)
          // Navigate to the return URL or dashboard
          this.router.navigate([returnUrl])
        }
      }),
      map(() => void 0),
    )
  }

  logout(): Observable<void> {
    // Clear token and user from state
    this.tokenSignal.set(null)
    this.userSignal.set(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('returnUrl')

    // Navigate to login
    return of(void 0).pipe(tap(() => this.router.navigate(['/login'])))
  }

  // Returns an observable that emits every time the signal changes
  isInitialized(): Observable<boolean> {
    return toObservable(this.initializedSignal)
  }

  // Utility method to get the auth header
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.tokenSignal()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Debug method for development only - auto-logs in with a test token
  debugLogin(): Observable<UserProfile | null> {
    const userId = 'test-user-123' // Any ID will work
    return this.http
      .get<{ access_token: string }>(`${API_URL}/auth/debug/token/${userId}`)
      .pipe(
        tap((response) => {
          // Store the token
          localStorage.setItem('auth_token', response.access_token)
          this.tokenSignal.set(response.access_token)
        }),
        switchMap(() => this.getCurrentUser()),
        tap((user) => {
          if (user) {
            this.userSignal.set(user)
          }
        }),
        catchError((error) => {
          console.error('Debug login failed:', error)
          return throwError(() => new Error('Debug login failed'))
        }),
      )
  }

  // Returns true if the user is authenticated
  checkIfAuthenticated(): boolean {
    return !!this.tokenSignal()
  }
}
