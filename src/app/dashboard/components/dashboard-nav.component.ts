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
              [disabled]="isSyncing()"
              class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
              [ngClass]="{
                'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600': !isSyncing(),
                'bg-blue-400 dark:bg-blue-400 cursor-not-allowed': isSyncing()
              }"
            >
              <span *ngIf="!isSyncing()">Save</span>
              <span *ngIf="isSyncing()" class="flex items-center gap-1">
                <svg
                  class="animate-spin h-4 w-4 text-white"
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
                Saving...
              </span>
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
      <!-- Sync feedback message -->
      <div
        *ngIf="syncStatus()"
        class="w-[98%] mx-auto mb-2 px-3 py-2 rounded-md text-sm"
        [ngClass]="{
          'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100':
            syncStatus() === 'success',
          'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100':
            syncStatus() === 'error'
        }"
      >
        {{ syncMessage() }}
      </div>
    </nav>
  `,
})
export class DashboardNavComponent {
  @Input() userEmail: string = 'User'
  @Output() signOut = new EventEmitter<void>()

  private flashcardService = inject(FlashcardService)
  private localStorageService = inject(LocalStorageService)

  // Status signals
  readonly isSyncing = signal(false)
  readonly syncStatus = signal<'success' | 'error' | null>(null)
  readonly syncMessage = signal('')

  async onSync(): Promise<void> {
    if (this.isSyncing()) return

    this.isSyncing.set(true)
    this.syncStatus.set(null)

    try {
      // Check for dirty items first
      const dirtyItems = this.localStorageService.getDirtyItems()
      console.log('Dirty items before sync:', dirtyItems)

      // Use the flashcard service to sync data to backend
      await this.flashcardService.syncToBackend()

      // Show appropriate message based on whether changes were synced
      if (dirtyItems.length === 0) {
        // No changes to sync
        this.syncStatus.set('success')
        this.syncMessage.set('Your cards are already saved to the cloud!')
      } else {
        // Changes were synced
        this.syncStatus.set('success')
        this.syncMessage.set('Cards saved to cloud successfully!')
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        if (this.syncStatus() === 'success') {
          this.syncStatus.set(null)
        }
      }, 3000)
    } catch (error) {
      console.error('Sync failed:', error)

      // Provide more detailed error message if available
      let errorMessage = 'Failed to save cards to cloud. Please try again.'

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = `Error: ${JSON.stringify(error)}`
        } catch {
          // If can't stringify, use default message
        }
      }

      this.syncStatus.set('error')
      this.syncMessage.set(errorMessage)
    } finally {
      this.isSyncing.set(false)
    }
  }

  onSignOut(): void {
    this.signOut.emit()
  }
}
