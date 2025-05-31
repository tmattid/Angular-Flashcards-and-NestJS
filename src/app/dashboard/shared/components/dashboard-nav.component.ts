import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FlashcardCDKService } from '../../../ai-chat/services/flashcard-cdk-service.service'
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
              [disabled]="isSyncing()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md disabled:opacity-50"
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
  activeTab = signal(0)
  private readonly flashcardService = inject(FlashcardCDKService)
  readonly isSyncing = signal(false)

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
    if (this.isSyncing()) return

    this.isSyncing.set(true)
    try {
      await this.flashcardService.saveSelectedSet()
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
