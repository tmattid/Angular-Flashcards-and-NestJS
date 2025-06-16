import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  computed,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FlashcardService } from '../../../services/flashcard-http.service'
import { LocalStorageService } from '../../../services/state/local-storage.service'
import { TabSelectorComponent } from './tab-selector.component'

@Component({
  selector: 'app-dashboard-nav',
  standalone: true,
  imports: [CommonModule, TabSelectorComponent],
  template: `
    <nav class="bg-white dark:bg-gray-800 shadow-sm p-2">
      <div class="w-[98%] px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <app-tab-selector
              (tabChange)="onTabChange($event)"
            />
          <div class="flex items-center gap-4">
            <span class="text-gray-700 dark:text-gray-300">
              {{ userEmail }}
            </span>
            <button
              (click)="onSync()"
              [disabled]="isSyncing() || !hasUnsavedChanges()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSyncing() ? 'Saving...' : 'Save' }}
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
  @Output() tabChange = new EventEmitter<
    'grid' | 'flashcard-list' | 'sets' | 'profile'
  >()

  private readonly activeTab = signal(0)
  private readonly flashcardService = inject(FlashcardService)
  private readonly localStorageService = inject(LocalStorageService)
  readonly isSyncing = signal(false)
  readonly hasUnsavedChanges = computed(
    () => this.localStorageService.getDirtyItems().length > 0,
  )

  constructor() {
    // Expose debug methods on window object for console access
    if (typeof window !== 'undefined') {
      ;(window as any).debugFlashcards = {
        clearAllDirtyItems: () => this.localStorageService.clearAllDirtyItems(),
        getDirtyItems: () => this.localStorageService.getDirtyItems(),
        getAllSets: () =>
          this.localStorageService
            .getState()
            .flashcardSets.map((s) => ({ id: s.id, title: s.title })),
      }
    }
  }

  onTabChange(index: number) {
    this.activeTab.set(index)
    const tabTypes: ['grid', 'flashcard-list', 'sets', 'profile'] = [
      'grid',
      'flashcard-list',
      'sets',
      'profile',
    ]
    this.tabChange.emit(tabTypes[index])
  }

  async onSync(): Promise<void> {
    if (this.isSyncing() || !this.hasUnsavedChanges()) {
      console.log('Sync skipped - either already syncing or no changes')
      return
    }

    console.log('🚀 Starting sync process...')
    this.isSyncing.set(true)
    try {
      await this.flashcardService.syncToBackend()
      console.log('✅ Sync completed successfully!')
    } catch (error) {
      console.error('❌ Sync failed:', (error as Error).message)
      console.error('❌ Full error:', error)
    } finally {
      this.isSyncing.set(false)
      console.log('🏁 Sync process finished')
    }
  }

  onSignOut(): void {
    this.signOut.emit()
  }
}
