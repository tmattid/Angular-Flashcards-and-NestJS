import { Injectable } from '@angular/core'
import { OpenAPI } from './core/OpenAPI'

@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  constructor() {
    this.initialize()
  }

  private initialize(): void {
    // Override the base URL to always use port 3000
    OpenAPI.BASE = 'http://localhost:3000'

    // Enable credentials for all requests
    OpenAPI.WITH_CREDENTIALS = true
    OpenAPI.CREDENTIALS = 'include'

    // Set token resolver to get the auth token from localStorage
    OpenAPI.TOKEN = async () => {
      const token = localStorage.getItem('auth_token')
      return token || ''
    }

    console.log('OpenAPI client configured with BASE URL:', OpenAPI.BASE)

    // Fix the URL for all API calls
    this.patchGlobalFetch()
  }

  /**
   * Directly patch the global fetch to ensure port 3000 on localhost
   * This approach is more reliable than trying to patch the internal methods
   */
  private patchGlobalFetch(): void {
    // Monkey patch fetch to intercept all requests
    const originalFetch = window.fetch
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      // Only intercept string URLs
      if (typeof input === 'string' && input.includes('localhost')) {
        try {
          const url = new URL(input)
          if (url.hostname === 'localhost') {
            url.port = '3000'
            const newUrl = url.toString()
            console.log(`Redirecting API call: ${input} → ${newUrl}`)
            input = newUrl
          }
        } catch (error) {
          console.error('Failed to parse URL:', error)
        }
      }

      // Call original fetch with fixed URL
      return originalFetch(input, init)
    }

    console.log('Patched fetch to redirect localhost requests to port 3000')
  }
}
