import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div
        class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center"
      >
        <svg
          *ngIf="loading"
          class="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        <h2 class="text-2xl font-semibold mb-2">Authenticating...</h2>
        <p class="text-gray-600">Please wait while we complete your sign-in.</p>
        <p *ngIf="error" class="mt-4 text-red-600">{{ error }}</p>
      </div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private authService = inject(AuthService)

  loading = true
  error: string | null = null

  ngOnInit(): void {
    // Get the token from the URL parameters
    this.route.queryParams.subscribe((params) => {
      const token = params['token']
      const returnUrl = params['returnUrl']

      if (returnUrl) {
        localStorage.setItem('returnUrl', returnUrl)
      }

      if (!token) {
        this.error = 'Authentication failed. No token received.'
        this.loading = false
        return
      }

      // Handle the token
      this.authService.handleAuthCallback(token).subscribe({
        next: () => {
          // The navigation will be handled in the handleAuthCallback method
          this.loading = false
        },
        error: (err) => {
          console.error('Auth callback error:', err)
          this.error = 'Authentication failed. Please try again.'
          this.loading = false
        },
      })
    })
  }
}
