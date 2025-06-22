import { Injectable, signal, effect, inject } from '@angular/core'
import { NgZone } from '@angular/core'
import { LayoutService } from './layout.service'

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly ngZone = inject(NgZone)
  private readonly layoutService = inject(LayoutService)
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)')

  readonly darkMode = signal<boolean>(false)

  constructor() {
    // Initialize dark mode from layout service or system preference
    const isDark = this.layoutService.isDarkMode || this.media.matches
    this.darkMode.set(isDark)

    // Listen for system theme changes
    this.media.addEventListener('change', (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        this.darkMode.set(e.matches)
        this.layoutService.updateConfig({
          colorScheme: e.matches ? 'dark' : 'light',
        })
      }
    })

    // Sync with layout service changes
    effect(() => {
      const layoutDarkMode = this.layoutService.isDarkMode
      if (this.darkMode() !== layoutDarkMode) {
        this.darkMode.set(layoutDarkMode)
      }
    })

    // Save theme changes to localStorage (for backward compatibility)
    effect(() => {
      this.ngZone.run(() => {
        localStorage.setItem('theme', this.darkMode() ? 'dark' : 'light')
        this.setDarkMode(this.darkMode())
      })
    })
  }

  setDarkMode(enabled: boolean) {
    document.body.setAttribute('data-ag-theme-mode', enabled ? 'dark' : 'light')
    // Update Tailwind/PrimeNG classes as before
    document.documentElement.classList.toggle('dark', enabled)
    document.documentElement.classList.toggle('app-dark', enabled)
  }

  toggleTheme(): void {
    // Use layout service for consistent theme management
    this.layoutService.changeColorScheme()
  }
}
