import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core'
import {
  provideRouter,
  withViewTransitions,
  withComponentInputBinding,
} from '@angular/router'
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { routes } from './app.routes'
import { providePrimeNG } from 'primeng/config'
import { definePreset } from '@primeng/themes'
import Lara from '@primeng/themes/lara'
import { authInterceptor } from './auth/auth.interceptor'
import { ApiConfigService } from './api/api-config.service'

/**
 * Theme Configuration inspired by Sakai-ng patterns
 *
 * Features:
 * - Multiple theme presets (Blue, Green)
 * - Proper dark/light mode support
 * - Consistent color schemes across components
 * - Integration with Tailwind CSS
 */

// Primary blue theme (default)
const FlashcardTheme = definePreset(Lara, {
  root: {
    background: 'black',
  },
  // Primary color blue
  semantic: {
    primary: {
      500: '#1E3A8A', // Base dark blue
      600: '#1E40AF', // Slightly darker
      700: '#1E4ED8', // Deep blue
      800: '#1E40AF', // Rich navy
      900: '#172554', // Darkest blue
    },
  },
})

// Theme selection utility
export const getThemePreset = (themeName = 'blue') => {
  switch (themeName) {
    case 'blue':
    default:
      return FlashcardTheme
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions(), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: FlashcardTheme,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: false,
        },
      },
      ripple: true,
      inputStyle: 'outlined',
    }),

    // Ensure API configuration is initialized before app starts
    {
      provide: APP_INITIALIZER,
      useFactory: (apiConfigService: ApiConfigService) => () => {
        console.log('🔧 API Configuration initialized', !!apiConfigService)
        return Promise.resolve()
      },
      deps: [ApiConfigService],
      multi: true,
    },
  ],
}
