import { Component, inject, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AuthService } from '../services/auth.service'
import { Router, ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="w-full max-w-md p-8 shadow-2xl rounded-lg">
        <h2 class="text-2xl font-semibold text-center mb-6">Welcome Back</h2>
        <button
          (click)="signInWithGoogle()"
          [disabled]="loading()"
          class="relative flex items-center justify-center gap-3 px-6 py-3 w-full text-white bg-red-600 rounded-lg shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300 disabled:opacity-50"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span *ngIf="!loading()">Sign in with Google</span>
          <svg
            *ngIf="loading()"
            class="w-5 h-5 absolute left-4 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
        </button>

        <div *ngIf="error()" class="mt-4 text-sm text-red-600 text-center">
          {{ error() }}
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  loading = signal<boolean>(false)
  error = signal<string | null>(null)

  ngOnInit(): void {
    // Access the signal value correctly with ()
    const isAuthenticated = this.authService.isAuthenticated()
    if (isAuthenticated) {
      this.router.navigate(['/dashboard'])
    }

    // Check for return URL in query params
    this.route.queryParams.subscribe((params) => {
      if (params['returnUrl']) {
        // Store return URL in localStorage for after login
        localStorage.setItem('returnUrl', params['returnUrl'])
      }
    })
  }

  signInWithGoogle(): void {
    this.loading.set(true)
    this.error.set(null)

    // Get any stored return URL
    const returnUrl = localStorage.getItem('returnUrl')

    // Our service handles redirection, pass the returnUrl in the callback URL
    // Use question mark for first parameter, not ampersand
    const callbackParams = returnUrl
      ? `?returnUrl=${encodeURIComponent(returnUrl)}`
      : ''
    this.authService.signInWithGoogle(callbackParams)
  }
}
