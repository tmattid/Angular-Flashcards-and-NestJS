import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { ButtonModule } from 'primeng/button'
import { ThemeService } from '../../../services/theme.service'

@Component({
  selector: 'app-grid-toolbar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div
      class="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-4">
        <!-- Sidebar Toggle -->
        <button
          (click)="toggleSidebar.emit()"
          class="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Toggle flashcard sets panel"
        >
          <svg
            class="w-5 h-5 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ currentSetTitle() || 'Select a Set' }}
        </h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ currentSetCardCount() }} cards
        </span>
        @if (selectedCardCount() > 0) {
        <span class="text-sm text-blue-600 dark:text-blue-400">
          {{ selectedCardCount() }} selected
        </span>
        }
      </div>

      <div class="flex items-center gap-2">
        <!-- Mode Toggle -->
        <div
          class="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800"
        >
          <button
            [class.bg-blue-500]="isEditMode()"
            [class.text-white]="isEditMode()"
            [class.text-gray-600]="!isEditMode()"
            [class.dark:text-gray-300]="!isEditMode()"
            class="px-3 py-2 text-sm font-medium transition-colors"
            (click)="setGridMode.emit('edit')"
          >
            📝 Edit
          </button>
          <button
            [class.bg-green-500]="isGenerateMode()"
            [class.text-white]="isGenerateMode()"
            [class.text-gray-600]="!isGenerateMode()"
            [class.dark:text-gray-300]="!isGenerateMode()"
            class="px-3 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-700 transition-colors"
            (click)="setGridMode.emit('generate')"
          >
            ✨ Generate
          </button>
        </div>

        <!-- Action Buttons -->
        <button
          class="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
          (click)="themeService.toggleTheme()"
          title="Toggle dark/light mode"
        >
          {{ themeService.darkMode() ? '☀️' : '🌙' }}
        </button>

        <button
          class="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          (click)="addCard.emit()"
        >
          Add Card
        </button>

        @if (selectedCardCount() > 0) {
        <button
          class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
          (click)="deleteSelectedCards.emit()"
        >
          Delete Selected
        </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridToolbarComponent {
  // Services
  themeService = inject(ThemeService)

  // Inputs
  currentSetTitle = input<string | null>(null)
  currentSetCardCount = input(0)
  selectedCardCount = input(0)
  isEditMode = input(false)
  isGenerateMode = input(false)

  // Outputs
  toggleSidebar = output<void>()
  setGridMode = output<'edit' | 'generate'>()
  addCard = output<void>()
  deleteSelectedCards = output<void>()
}
