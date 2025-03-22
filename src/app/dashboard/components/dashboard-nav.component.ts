import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FlashcardService } from '../../services/flashcard-http.service'
import { SupabaseService } from '../../services/supabase.service'
import { LocalStorageService } from '../../services/state/local-storage.service'

@Component({
  selector: 'app-dashboard-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="w-[98%] px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <div class="flex items-center gap-4">
            <span class="text-gray-700 dark:text-gray-300">
              {{ userEmail }}
            </span>
            <button
              (click)="onSync()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md"
            >
              Save
            </button>

            <button
              (click)="onSignOut()"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  `,
})
export class DashboardNavComponent {
  @Input() userEmail: string = 'User'
  @Output() signOut = new EventEmitter<void>()

  private flashcardService = inject(FlashcardService)
  private localStorageService = inject(LocalStorageService)
  private supabase = inject(SupabaseService)

  private isSyncing = signal(false)

  async onSync(): Promise<void> {
    if (this.isSyncing()) return

    this.isSyncing.set(true)
    try {
      await this.flashcardService.syncToSupabase()
      console.log('Sync successful')
    } catch (error) {
      console.error('Sync failed:', (error as Error).message)
    } finally {
      this.isSyncing.set(false)
    }
  }

  onSignOut(): void {
    this.signOut.emit()
  }
}
