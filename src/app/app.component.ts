import { TuiRoot } from '@taiga-ui/core'
import { Component, effect, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ThemeService } from './services/theme.service'
import { NgClass } from '@angular/common'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly themeService = inject(ThemeService)

  constructor() {
    // Set up an effect to handle theme changes
    effect(() => {
      const isDark = Boolean(this.themeService.darkMode())
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.classList.toggle('app-dark-mode', isDark)
    })
  }
}
