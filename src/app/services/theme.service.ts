import { Injectable, signal, effect, inject } from '@angular/core'
import { WA_LOCAL_STORAGE, WA_WINDOW } from '@ng-web-apis/common'
import { NgZone } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storage = inject(WA_LOCAL_STORAGE)
  private readonly media = inject(WA_WINDOW).matchMedia(
    '(prefers-color-scheme: dark)',
  )
  private readonly ngZone = inject(NgZone)

  readonly darkMode = signal<boolean>(false)

  constructor() {
    // Initialize dark mode from localStorage or system preference
    const savedTheme = this.storage.getItem('theme')
    this.darkMode.set(savedTheme ? savedTheme === 'dark' : this.media.matches)

    // Listen for system theme changes
    this.media.addEventListener('change', (e) => {
      if (!this.storage.getItem('theme')) {
        this.darkMode.set(e.matches)
      }
    })

    // Save theme changes to localStorage
    effect(() => {
      this.ngZone.run(() => {
        this.storage.setItem('theme', this.darkMode() ? 'dark' : 'light')
        this.setDarkMode(this.darkMode())
        // Update HTML class for Tailwind
        document.documentElement.classList.toggle('dark', this.darkMode())
      })
    })
  }

  setDarkMode(enabled: boolean) {
    document.body.dataset['agThemeMode'] = enabled ? 'dark-red' : 'light-red'
  }

  toggleTheme(): void {
    this.darkMode.update((dark) => !dark)
  }
}
