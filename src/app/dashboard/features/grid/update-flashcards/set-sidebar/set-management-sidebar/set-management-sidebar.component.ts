import {
  Component,
  inject,
  computed,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Subject, takeUntil } from 'rxjs'
import {
  FlashcardSetWithCards,
  CreateFlashcardSetDto,
} from '../../../../../../api'
import { LocalStorageService } from '../../../../../../services/state/local-storage.service'
import { SetSelectionService } from '../../../../../../services/set-selection.service'
import { ThemeService } from '../../../../../../services/theme.service'
import { FlashcardService } from '../../../../../../services/flashcard-http.service'
import { AuthService } from '../../../../../../services/auth.service'

@Component({
  selector: 'app-set-management-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar-container">
      <!-- Action Header -->
      <div class="action-header">
        <button
          (click)="toggleCreateMode()"
          class="create-btn-full"
          [class.active]="isCreating()"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span class="ml-2">Create New Set</span>
        </button>
      </div>

      <!-- Create New Set Form -->
      <div *ngIf="isCreating()" class="create-form">
        <div class="form-group">
          <input
            type="text"
            [ngModel]="newSetTitle()"
            (ngModelChange)="newSetTitle.set($event)"
            placeholder="Enter set title..."
            class="form-input"
            (keyup.enter)="createNewSet()"
            (keyup.escape)="cancelCreate()"
            #newSetInput
          />
        </div>
        <div class="form-actions">
          <button
            (click)="createNewSet()"
            [disabled]="!newSetTitle().trim()"
            class="btn-primary"
          >
            Create
          </button>
          <button (click)="cancelCreate()" class="btn-secondary">
            Cancel
          </button>
        </div>
      </div>

      <!-- Search/Filter -->
      <div class="search-container">
        <div class="relative">
          <svg
            class="search-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
            placeholder="Search sets..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Sets List -->
      <div class="sets-list">
        <div
          *ngIf="filteredSets().length === 0 && !isLoading()"
          class="empty-state"
        >
          <div class="empty-icon">
            <svg
              class="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p class="empty-title">No sets found</p>
          <p class="empty-subtitle">
            {{
              searchTerm()
                ? 'Try a different search term'
                : 'Create your first flashcard set to get started'
            }}
          </p>
        </div>

        <div
          *ngFor="let set of filteredSets(); trackBy: trackBySetId"
          class="set-item"
          [class.selected]="isSelected(set)"
          (click)="selectSet(set)"
        >
          <!-- Set Icon -->
          <div class="set-icon">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>

          <!-- Set Content -->
          <div class="set-content">
            <div class="set-title-container">
              <div
                *ngIf="editingSetId() !== set.id"
                class="set-title"
                (dblclick)="startEdit(set)"
                title="Double-click to edit"
              >
                {{ set.title }}
              </div>
              <div *ngIf="editingSetId() === set.id" class="edit-container">
                <input
                  type="text"
                  [(ngModel)]="editingTitle"
                  class="edit-input"
                  (keyup.enter)="saveEdit(set)"
                  (keyup.escape)="cancelEditSet()"
                  (blur)="saveEdit(set)"
                  #editInput
                />
              </div>
            </div>
            <div class="set-meta">
              <span class="card-count">{{ set.flashcards.length }} cards</span>
              <span class="separator">•</span>
              <span class="created-date">{{ formatDate(set.createdAt) }}</span>
            </div>
            <div *ngIf="set.description" class="set-description">
              {{ set.description }}
            </div>
          </div>

          <!-- Set Actions -->
          <div class="set-actions" (click)="$event.stopPropagation()">
            <button
              (click)="startEdit(set)"
              class="action-btn"
              title="Edit set name"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              (click)="showDeleteConfirmation(set)"
              class="action-btn delete"
              title="Delete set"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Footer -->
      <div class="sidebar-footer">
        <div class="stats">
          <div class="stat">
            <span class="stat-value">{{ availableSets().length }}</span>
            <span class="stat-label">Sets</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalCards }}</span>
            <span class="stat-label">Cards</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div
      *ngIf="showDeleteDialog()"
      class="dialog-overlay"
      (click)="cancelDelete()"
    >
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3 class="dialog-title">Delete Flashcard Set</h3>
        </div>
        <div class="dialog-body">
          <p>
            Are you sure you want to delete
            <strong>"{{ setToDelete?.title }}"</strong>
            ?
          </p>
          <p class="dialog-warning">
            This action cannot be undone and will permanently delete all
            {{ setToDelete?.flashcards?.length || 0 }} cards in this set.
          </p>
        </div>
        <div class="dialog-actions">
          <button (click)="cancelDelete()" class="btn-secondary">
            Cancel
          </button>
          <button (click)="confirmDelete()" class="btn-danger">
            Delete Set
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .sidebar-container {
        @apply flex flex-col h-full;
      }

      .action-header {
        @apply p-3 border-b border-gray-200 dark:border-gray-700;
      }

      .create-btn-full {
        @apply w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center;
      }

      .create-btn-full.active {
        @apply bg-blue-700;
      }

      .create-form {
        @apply p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700;
      }

      .form-group {
        @apply mb-3;
      }

      .form-input {
        @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent;
      }

      .form-actions {
        @apply flex gap-2;
      }

      .btn-primary {
        @apply px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors;
      }

      .btn-secondary {
        @apply px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors;
      }

      .search-container {
        @apply p-4 border-b border-gray-200 dark:border-gray-700;
      }

      .search-icon {
        @apply absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400;
      }

      .search-input {
        @apply w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent;
      }

      .sets-list {
        @apply flex-1 overflow-y-auto min-h-0;
      }

      .empty-state {
        @apply flex flex-col items-center justify-center h-full p-6 text-center;
      }

      .empty-icon {
        @apply text-gray-400 dark:text-gray-500 mb-4;
      }

      .empty-title {
        @apply text-lg font-medium text-gray-900 dark:text-white mb-1;
      }

      .empty-subtitle {
        @apply text-sm text-gray-500 dark:text-gray-400;
      }

      .set-item {
        @apply flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors;
      }

      .set-item.selected {
        @apply bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800;
      }

      .set-item:last-child {
        @apply border-b-0;
      }

      .set-icon {
        @apply flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300;
      }

      .set-item.selected .set-icon {
        @apply bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400;
      }

      .set-content {
        @apply flex-1 min-w-0;
      }

      .set-title {
        @apply font-medium text-gray-900 dark:text-white truncate;
      }

      .set-meta {
        @apply flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400;
      }

      .separator {
        @apply mx-1;
      }

      .set-description {
        @apply mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2;
      }

      .edit-input {
        @apply w-full px-2 py-1 text-sm border border-blue-300 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent;
      }

      .set-actions {
        @apply flex items-center gap-1 opacity-0 transition-opacity;
      }

      .set-item:hover .set-actions {
        @apply opacity-100;
      }

      .action-btn {
        @apply p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors;
      }

      .action-btn.delete {
        @apply hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20;
      }

      .sidebar-footer {
        @apply p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800;
      }

      .stats {
        @apply flex justify-around;
      }

      .stat {
        @apply text-center;
      }

      .stat-value {
        @apply block text-lg font-bold text-gray-900 dark:text-white;
      }

      .stat-label {
        @apply text-xs text-gray-500 dark:text-gray-400;
      }

      /* Dialog styles */
      .dialog-overlay {
        @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4;
      }

      .dialog-content {
        @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full;
      }

      .dialog-header {
        @apply p-4 border-b border-gray-200 dark:border-gray-700;
      }

      .dialog-title {
        @apply text-lg font-semibold text-gray-900 dark:text-white;
      }

      .dialog-body {
        @apply p-4 space-y-3;
      }

      .dialog-body p {
        @apply text-gray-700 dark:text-gray-300;
      }

      .dialog-warning {
        @apply text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded;
      }

      .dialog-actions {
        @apply p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3;
      }

      .btn-danger {
        @apply px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors;
      }

      /* Utility classes */
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class SetManagementSidebarComponent implements OnInit, OnDestroy {
  private readonly localStorageService = inject(LocalStorageService)
  private readonly setSelectionService = inject(SetSelectionService)
  private readonly themeService = inject(ThemeService)
  private readonly flashcardService = inject(FlashcardService)
  private readonly authService = inject(AuthService)
  private readonly destroy$ = new Subject<void>()

  // State
  readonly isCreating = signal(false)
  readonly isLoading = signal(false)
  readonly searchTerm = signal('')
  readonly newSetTitle = signal('')

  // Edit state
  readonly editingSetId = signal<string | null>(null)
  editingTitle = ''

  // Delete confirmation state
  readonly showDeleteDialog = signal(false)
  setToDelete: FlashcardSetWithCards | null = null

  // Computed properties
  readonly availableSets = computed(() => {
    return this.localStorageService.getState().flashcardSets
  })

  readonly filteredSets = computed(() => {
    const sets = this.availableSets()
    const search = this.searchTerm().toLowerCase().trim()

    if (!search) return sets

    return sets.filter(
      (set) =>
        set.title.toLowerCase().includes(search) ||
        set.description?.toLowerCase().includes(search),
    )
  })

  readonly selectedSet = computed(() => {
    return this.setSelectionService.getSelectedSet()
  })

  get totalCards(): number {
    return this.availableSets().reduce(
      (total, set) => total + set.flashcards.length,
      0,
    )
  }

  ngOnInit() {
    // Subscribe to state changes
    this.localStorageService.stateChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // React to state changes if needed
      })
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  toggleCreateMode() {
    this.isCreating.update((value) => !value)
    if (this.isCreating()) {
      this.newSetTitle.set('')
      // Focus input after view update
      setTimeout(() => {
        const input = document.querySelector('.form-input') as HTMLInputElement
        input?.focus()
      }, 0)
    }
  }

  cancelCreate() {
    this.isCreating.set(false)
    this.newSetTitle.set('')
  }

  async createNewSet() {
    const title = this.newSetTitle().trim()
    if (!title) return

    this.isLoading.set(true)

    try {
      const newSetId = crypto.randomUUID()
      const newSet: FlashcardSetWithCards = {
        id: newSetId,
        title,
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        flashcards: [],
        iconId: '@tui.book',
        setPosition: this.availableSets().length,
        createdBy: this.authService.user()?.id ?? 'local-user',
      }

      // Update local storage
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: [...state.flashcardSets, newSet],
      }))

      // Mark as dirty for syncing
      this.localStorageService.markDirty(newSetId)

      // Select the new set
      this.setSelectionService.setSelectedSet(newSet)

      // Try to sync to backend
      try {
        await this.flashcardService.syncToBackend()
      } catch (error) {
        console.warn('Failed to sync new set to backend:', error)
      }

      // Reset form
      this.cancelCreate()
    } catch (error) {
      console.error('Failed to create new set:', error)
    } finally {
      this.isLoading.set(false)
    }
  }

  selectSet(set: FlashcardSetWithCards) {
    this.setSelectionService.setSelectedSet(set)
  }

  isSelected(set: FlashcardSetWithCards): boolean {
    return this.selectedSet()?.id === set.id
  }

  // Edit functionality
  startEdit(set: FlashcardSetWithCards) {
    this.editingSetId.set(set.id)
    this.editingTitle = set.title

    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('.edit-input') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }

  async saveEdit(set: FlashcardSetWithCards) {
    const newTitle = this.editingTitle.trim()
    if (!newTitle || newTitle === set.title) {
      this.cancelEditSet()
      return
    }

    this.isLoading.set(true)

    try {
      // Update local storage
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((s) =>
          s.id === set.id
            ? { ...s, title: newTitle, updatedAt: new Date().toISOString() }
            : s,
        ),
      }))

      // Mark as dirty for syncing
      this.localStorageService.markDirty(set.id)

      // Try to sync to backend
      try {
        await this.flashcardService.syncToBackend()
      } catch (error) {
        console.warn('Failed to sync set title change to backend:', error)
      }

      this.cancelEditSet()
    } catch (error) {
      console.error('Failed to update set title:', error)
    } finally {
      this.isLoading.set(false)
    }
  }

  cancelEditSet() {
    this.editingSetId.set(null)
    this.editingTitle = ''
  }

  // Delete functionality
  showDeleteConfirmation(set: FlashcardSetWithCards) {
    this.setToDelete = set
    this.showDeleteDialog.set(true)
  }

  async confirmDelete() {
    if (!this.setToDelete) return

    this.isLoading.set(true)

    try {
      const setId = this.setToDelete.id

      // Update local storage
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.filter((s) => s.id !== setId),
      }))

      // If this was the selected set, clear selection or select another
      if (this.selectedSet()?.id === setId) {
        const remainingSets = this.availableSets()
        if (remainingSets.length > 0) {
          this.setSelectionService.setSelectedSet(remainingSets[0])
        } else {
          this.setSelectionService.setSelectedSet(null)
        }
      }

      // Try to delete from backend
      try {
        await this.flashcardService.deleteFlashcardSet(setId).toPromise()
      } catch (error) {
        console.warn('Failed to delete set from backend:', error)
      }
    } catch (error) {
      console.error('Failed to delete set:', error)
    } finally {
      this.isLoading.set(false)
      this.cancelDelete()
    }
  }

  cancelDelete() {
    this.showDeleteDialog.set(false)
    this.setToDelete = null
  }

  trackBySetId(index: number, set: FlashcardSetWithCards): string {
    return set.id
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}
