import { Component, inject, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AuthService } from '../services/auth.service'
import { Router, ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
    >
      <main class="grid lg:grid-cols-2 min-h-screen">
        <!-- Left side: Branding -->
        <div
          class="hidden lg:flex flex-col justify-center items-center p-12 bg-blue-600 dark:bg-blue-800 text-white"
        >
          <div class="max-w-md text-center">
            <h1 class="text-5xl font-bold mb-4">Flashcard Fusion</h1>
            <p class="text-xl mb-8">
              Unlock your learning potential. Create, share, and master subjects
              with AI-powered flashcards.
            </p>
            <div class="space-y-4 text-left mx-auto max-w-sm">
              <div class="flex items-center gap-3">
                <svg
                  class="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707.707"
                  ></path>
                </svg>
                <span>AI-Powered Card Generation</span>
              </div>
              <div class="flex items-center gap-3">
                <svg
                  class="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                <span>Spaced Repetition System</span>
              </div>
              <div class="flex items-center gap-3">
                <svg
                  class="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
                <span>Collaborate & Share Sets</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right side: Login Form -->
        <div class="flex flex-col justify-center items-center p-8 sm:p-12">
          <div class="w-full max-w-md">
            <!-- App logo for mobile -->
            <div class="lg:hidden text-center mb-8">
              <h1 class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                Flashcard Fusion
              </h1>
            </div>

            <div class="bg-white dark:bg-gray-800 p-8 shadow-2xl rounded-2xl">
              <h2
                class="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100"
              >
                Welcome Back
              </h2>
              <p class="text-center text-gray-600 dark:text-gray-400 mb-8">
                Sign in to continue your learning journey.
              </p>

              <button
                (click)="signInWithGoogle()"
                [disabled]="loading()"
                class="relative flex items-center justify-center gap-3 px-6 py-4 w-full text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-300 disabled:opacity-50"
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
                  class="w-6 h-6 absolute left-1/2 -ml-3 animate-spin text-white"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </button>

              <div
                *ngIf="error()"
                class="mt-6 text-sm text-red-600 dark:text-red-400 text-center"
              >
                {{ error() }}
              </div>
            </div>
          </div>
        </div>
      </main>
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
