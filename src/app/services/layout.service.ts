import { Injectable, signal, effect } from '@angular/core'

export interface AppConfig {
  inputStyle: 'outlined' | 'filled'
  colorScheme: 'light' | 'dark'
  theme: string
  ripple: boolean
  menuMode: 'static' | 'overlay'
  scale: number
}

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  // Default configuration inspired by Sakai-ng
  readonly config = signal<AppConfig>({
    inputStyle: 'outlined',
    colorScheme: 'light',
    theme: 'flashcard-light-blue',
    ripple: true,
    menuMode: 'static',
    scale: 14,
  })

  readonly scale = signal<number>(14)

  constructor() {
    // Load saved configuration
    this.loadConfig()

    // Save configuration changes
    effect(() => {
      this.saveConfig()
      this.updateThemeClass()
    })
  }

  private loadConfig(): void {
    const savedConfig = localStorage.getItem('app-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig) as AppConfig
        this.config.set(config)
        this.scale.set(config.scale)
      } catch (error) {
        console.warn('Failed to parse saved config:', error)
      }
    }
  }

  private saveConfig(): void {
    localStorage.setItem('app-config', JSON.stringify(this.config()))
  }

  private updateThemeClass(): void {
    const isDark = this.config().colorScheme === 'dark'

    // Update classes for both Tailwind and PrimeNG
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('app-dark', isDark)

    // Update AG Grid theme
    document.body.dataset['agThemeMode'] = isDark ? 'dark-red' : 'light-red'

    console.log('Theme updated:', {
      isDark,
      classes: document.documentElement.className,
    })
  }

  updateConfig(config: Partial<AppConfig>): void {
    this.config.update((current) => ({ ...current, ...config }))
  }

  changeColorScheme(): void {
    this.updateConfig({
      colorScheme: this.config().colorScheme === 'light' ? 'dark' : 'light',
    })
  }

  changeTheme(theme: string): void {
    this.updateConfig({ theme })
  }

  changeScale(scale: number): void {
    this.scale.set(scale)
    this.updateConfig({ scale })
    document.documentElement.style.fontSize = scale + 'px'
  }

  // Getters for easy access
  get isDarkMode(): boolean {
    return this.config().colorScheme === 'dark'
  }

  get currentTheme(): string {
    return this.config().theme
  }

  get currentScale(): number {
    return this.scale()
  }
}
