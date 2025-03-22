import { Component, inject, Input, TrackByFunction } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { Flashcard } from '../models/flashcards.models'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'
import { ThemeService } from '../services/theme.service'
import { FlashcardService } from '../services/flashcard-http.service'
import { signal } from '@angular/core'
import { AuthService } from '../services/auth.service'
import { environment } from '../../environments/environment'
import { firstValueFrom } from 'rxjs'
import {
  LocalStorageService,
  LocalStorageState,
} from '../services/state/local-storage.service'
import { ValidatedFlashcardSet } from '../models/flashcards.models'

@Component({
  selector: 'app-flashcard-list',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="flex flex-col h-full p-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
        <!-- Generated (new) flashcards drop zone -->
        <div class="flex flex-col h-full overflow-hidden">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-lg font-bold flex-shrink-0 dark:text-gray-200">
              Newly Generated Cards
            </h3>
            <button
              *ngIf="
                flashcardCDKService.newFlashcards().length > 0 &&
                flashcardCDKService.selectedSetId()
              "
              (click)="addAllCardsToSet()"
              class="text-sm px-3 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <span>Add All to Set</span>
            </button>
          </div>
          <div
            id="new-flashcards"
            cdkDropList
            [cdkDropListData]="flashcardCDKService.newFlashcards()"
            [cdkDropListConnectedTo]="['selected-flashcards']"
            (cdkDropListDropped)="onDrop($event)"
            class="bg-gray-100 dark:bg-gray-800 p-4 rounded border-2 border-dashed border-gray-300 dark:border-gray-700 flex-1 overflow-y-auto"
          >
            <div
              *ngFor="
                let card of flashcardCDKService.newFlashcards();
                trackBy: trackByCard;
                index as i
              "
              cdkDrag
              class="border rounded-lg p-4 shadow mb-2 cursor-move relative group hover:shadow-lg transition-shadow bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <div class="font-bold mb-2 dark:text-gray-200">Front:</div>
              <div class="p-2 rounded mb-4 dark:text-gray-300">
                {{ card.front }}
              </div>
              <div class="font-bold mb-2 dark:text-gray-200">Back:</div>
              <div class="p-2 rounded dark:text-gray-300">{{ card.back }}</div>
            </div>
            <div
              *ngIf="flashcardCDKService.newFlashcards().length === 0"
              class="text-gray-500 dark:text-gray-400 text-center py-8"
            >
              No new cards generated yet
            </div>
          </div>
        </div>

        <!-- Selected flashcard set drop zone -->
        <div class="flex flex-col h-full overflow-hidden">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-lg font-bold flex-shrink-0 dark:text-gray-200">
              {{
                flashcardCDKService.selectedSetId()
                  ? 'Cards in Selected Set'
                  : 'Create or Select a Set'
              }}
            </h3>
            <button
              *ngIf="flashcardCDKService.selectedSetId()"
              (click)="syncToBackend()"
              [disabled]="isSyncing()"
              class="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <span *ngIf="isSyncing()">Syncing...</span>
              <span *ngIf="!isSyncing()">Sync to Cloud</span>
            </button>
          </div>
          <div
            id="selected-flashcards"
            cdkDropList
            [cdkDropListData]="flashcardCDKService.selectedSetCards()"
            [cdkDropListConnectedTo]="['new-flashcards']"
            (cdkDropListDropped)="onDrop($event)"
            class="bg-gray-100 dark:bg-gray-800 p-4 rounded border-2 border-dashed border-gray-300 dark:border-gray-700 flex-1 overflow-y-auto"
          >
            <div
              *ngFor="
                let card of flashcardCDKService.selectedSetCards();
                trackBy: trackByCard;
                index as i
              "
              cdkDrag
              class="border rounded-lg p-4 shadow mb-2 cursor-move relative group hover:shadow-lg transition-shadow bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <div class="font-bold mb-2 dark:text-gray-200">Front:</div>
              <div class="p-2 rounded mb-4 dark:text-gray-300">
                {{ card.front }}
              </div>
              <div class="font-bold mb-2 dark:text-gray-200">Back:</div>
              <div class="p-2 rounded dark:text-gray-300">{{ card.back }}</div>
            </div>
            <div
              *ngIf="flashcardCDKService.selectedSetCards().length === 0"
              class="text-gray-500 dark:text-gray-400 text-center py-8"
            >
              {{
                flashcardCDKService.selectedSetId()
                  ? 'No cards in set yet'
                  : 'Select or create a set first'
              }}
            </div>
          </div>
        </div>
      </div>

      <!-- Sync feedback message -->
      <div
        *ngIf="syncStatus()"
        class="mt-3 px-3 py-2 rounded-md text-sm"
        [ngClass]="{
          'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100':
            syncStatus() === 'success',
          'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100':
            syncStatus() === 'error'
        }"
      >
        {{ syncMessage() }}
      </div>

      <!-- Debug controls (only in dev mode) -->
      <div
        *ngIf="showDebugControls"
        class="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700"
      >
        <h4 class="font-bold mb-2">Debug Controls</h4>
        <div class="flex flex-wrap gap-2">
          <button
            (click)="resetLocalStorage()"
            class="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Reset Storage
          </button>
          <button
            (click)="cleanupDuplicates()"
            class="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Remove Duplicates
          </button>
          <button
            (click)="clearNewCards()"
            class="px-2 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Clear New Cards
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .cdk-drag-preview {
        @apply shadow-xl border rounded-lg p-4 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200;
      }
      .cdk-drag-placeholder {
        opacity: 0;
      }
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drop-list-dragging .cdk-drag {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class FlashcardListComponent {
  @Input() flashcards: Flashcard[] = []
  readonly flashcardCDKService = inject(FlashcardCDKService)
  readonly themeService = inject(ThemeService)
  private readonly flashcardService = inject(FlashcardService)
  private readonly authService = inject(AuthService)
  private readonly localStorageService = inject(LocalStorageService)

  // Add state for sync status
  readonly isSyncing = signal(false)
  readonly syncStatus = signal<'success' | 'error' | null>(null)
  readonly syncMessage = signal('')

  // Debug controls
  readonly showDebugControls = !environment.production

  trackByCard: TrackByFunction<Flashcard> = (
    index: number,
    card: Flashcard,
  ): string => {
    return card.id
  }

  onDrop(event: CdkDragDrop<Flashcard[]>): void {
    const fromNewToSelected =
      event.previousContainer.id === 'new-flashcards' &&
      event.container.id === 'selected-flashcards'
    const fromSelectedToNew =
      event.previousContainer.id === 'selected-flashcards' &&
      event.container.id === 'new-flashcards'

    // Get current set ID before any modifications
    const selectedSetId = this.flashcardCDKService.selectedSetId()
    if (!selectedSetId && fromNewToSelected) {
      console.error('Cannot move card to selected set - no set selected')
      return
    }

    console.log(
      `Dropping card from ${event.previousContainer.id} to ${event.container.id}`,
    )
    console.log(
      `Previous index: ${event.previousIndex}, Current index: ${event.currentIndex}`,
    )

    // If moving from new to selected, verify the set exists first
    if (fromNewToSelected && selectedSetId) {
      // Verify set exists before trying to add cards to it
      this.flashcardCDKService.verifySetExists(selectedSetId)
    }

    if (event.previousContainer === event.container) {
      // Reordering within the same container
      console.log('Reordering within the same container')

      // Clone the array to avoid direct mutation issues
      const cards = [...event.container.data]
      const movedItem = cards[event.previousIndex]

      // Remove item from its original position
      cards.splice(event.previousIndex, 1)
      // Insert it at the new position
      cards.splice(event.currentIndex, 0, movedItem)

      // Update the container data directly to ensure view updates
      if (event.container.id === 'new-flashcards') {
        this.flashcardCDKService.newFlashcards.set(cards)
      } else if (
        event.container.id === 'selected-flashcards' &&
        selectedSetId
      ) {
        // Update flashcards in selected set with proper properties
        const updatedCards = cards.map((card, index) => ({
          ...card,
          position: index,
          flashcard_set_id: selectedSetId,
        }))

        // Update the selected set in both services
        this.localStorageService.updateState((state) => ({
          ...state,
          flashcardSets: state.flashcardSets.map((set) =>
            set.id === selectedSetId
              ? { ...set, flashcards: updatedCards }
              : set,
          ),
        }))

        // Mark as dirty for syncing
        this.localStorageService.markDirty(selectedSetId)
      }

      this.updateCardPositions()
    } else {
      // Moving between containers
      console.log('Moving card between containers')

      // Get the card being moved
      const cardToMove = event.previousContainer.data[event.previousIndex]
      console.log('Card being moved:', cardToMove)

      if (fromNewToSelected && selectedSetId) {
        // Moving from new to selected
        // First, remove from source container
        const newCards = [...this.flashcardCDKService.newFlashcards()]
        newCards.splice(event.previousIndex, 1)
        this.flashcardCDKService.newFlashcards.set(newCards)

        // Then, add to destination container with proper properties
        const selectedCards = [...this.flashcardCDKService.selectedSetCards()]
        const updatedCard = {
          ...cardToMove,
          flashcard_set_id: selectedSetId,
          position: event.currentIndex,
        }
        selectedCards.splice(event.currentIndex, 0, updatedCard)

        // Update positions for all cards
        const updatedSelectedCards = selectedCards.map((card, index) => ({
          ...card,
          position: index,
          flashcard_set_id: selectedSetId,
        }))

        // Update the selected set in both services
        this.localStorageService.updateState((state) => ({
          ...state,
          flashcardSets: state.flashcardSets.map((set) =>
            set.id === selectedSetId
              ? { ...set, flashcards: updatedSelectedCards }
              : set,
          ),
        }))

        // Mark as dirty and save
        this.localStorageService.markDirty(selectedSetId)
        console.log(`Added card to set ${selectedSetId} and marked as dirty`)
      } else if (fromSelectedToNew) {
        // Moving from selected to new
        // First, remove from selected set
        const selectedCards = [...this.flashcardCDKService.selectedSetCards()]
        selectedCards.splice(event.previousIndex, 1)

        if (selectedSetId) {
          // Update the selected set
          const updatedSelectedCards = selectedCards.map((card, index) => ({
            ...card,
            position: index,
            flashcard_set_id: selectedSetId,
          }))

          this.localStorageService.updateState((state) => ({
            ...state,
            flashcardSets: state.flashcardSets.map((set) =>
              set.id === selectedSetId
                ? { ...set, flashcards: updatedSelectedCards }
                : set,
            ),
          }))

          this.localStorageService.markDirty(selectedSetId)
        }

        // Then, add to new flashcards
        const newCards = [...this.flashcardCDKService.newFlashcards()]
        // Remove set ID since it's now in the new cards container
        const updatedCard = {
          ...cardToMove,
          flashcard_set_id: '', // Use empty string instead of null
          position: event.currentIndex,
        }
        newCards.splice(event.currentIndex, 0, updatedCard)
        this.flashcardCDKService.newFlashcards.set(newCards)
      }
    }

    // Save changes to the flashcard service
    if (selectedSetId) {
      this.flashcardCDKService.saveSelectedSet()
    }
  }

  private updateCardPositions(): void {
    console.log('Updating card positions')

    // Update new flashcards
    const newCards = this.flashcardCDKService.newFlashcards()
    if (newCards.length > 0) {
      const updatedNewCards = newCards.map((card, index) => ({
        ...card,
        position: index,
      }))
      this.flashcardCDKService.newFlashcards.set(updatedNewCards)
      console.log(`Updated positions for ${updatedNewCards.length} new cards`)
    }

    // Update selected set cards
    const selectedSetId = this.flashcardCDKService.selectedSetId()
    if (selectedSetId) {
      const selectedCards = this.flashcardCDKService.selectedSetCards()
      if (selectedCards.length > 0) {
        const updatedSelectedCards = selectedCards.map((card, index) => ({
          ...card,
          position: index,
          flashcard_set_id: selectedSetId,
        }))

        // Update directly in LocalStorageService
        this.localStorageService.updateState((state) => ({
          ...state,
          flashcardSets: state.flashcardSets.map((set) =>
            set.id === selectedSetId
              ? { ...set, flashcards: updatedSelectedCards }
              : set,
          ),
        }))

        console.log(
          `Updated positions for ${updatedSelectedCards.length} cards in set ${selectedSetId}`,
        )

        // Mark the set as dirty for syncing
        this.localStorageService.markDirty(selectedSetId)
      }
    }
  }

  saveSet(): void {
    this.flashcardCDKService.saveSelectedSet()
  }

  /**
   * Adds all newly generated cards to the selected set at once
   */
  addAllCardsToSet(): void {
    const selectedSetId = this.flashcardCDKService.selectedSetId()
    const newCards = this.flashcardCDKService.newFlashcards()

    if (!selectedSetId || newCards.length === 0) {
      console.warn('Cannot add cards - no set selected or no new cards')
      return
    }

    console.log(`Adding ${newCards.length} cards to set ${selectedSetId}`)

    // First verify that the set exists
    if (!this.flashcardCDKService.verifySetExists(selectedSetId)) {
      console.error(
        `Failed to verify set ${selectedSetId} exists, cannot add cards`,
      )
      return
    }

    // Get a copy of all new cards
    const allNewCards = [...newCards]

    // Clear the new cards list immediately to prevent duplicates
    this.flashcardCDKService.newFlashcards.set([])

    // Get the current selected set cards
    const currentSetCards = [...this.flashcardCDKService.selectedSetCards()]

    // Add all new cards to the end of the current set with proper set ID and positions
    const updatedCards = [
      ...currentSetCards,
      ...allNewCards.map((card, index) => ({
        ...card,
        position: currentSetCards.length + index,
        flashcard_set_id: selectedSetId,
      })),
    ]

    // Update positions and save to LocalStorageService
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === selectedSetId
          ? {
              ...set,
              flashcards: updatedCards,
              updated_at: new Date().toISOString(),
            }
          : set,
      ),
    }))

    // Mark the set as dirty for syncing
    this.localStorageService.markDirty(selectedSetId)
    console.log(
      `Added ${allNewCards.length} cards to set ${selectedSetId} and marked as dirty`,
    )

    // Save changes
    this.saveSet()
  }

  /**
   * Syncs current flashcards to the backend
   * This method is kept for service functionality but is called from the navbar
   */
  async syncToBackend(): Promise<void> {
    if (this.isSyncing()) return

    this.isSyncing.set(true)
    this.syncStatus.set(null)

    try {
      console.log(`API URL from environment: ${environment.apiUrl}`)

      // First ensure local state is properly saved
      this.saveSet()

      // Check if there are dirty items to sync
      const dirtyItems = this.flashcardService.getDirtyItems()
      console.log('Dirty items before sync:', dirtyItems)

      // Then sync to backend
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
      console.error('Error syncing to backend:', error)
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

  /**
   * Saves the updated card positions to local storage
   */
  saveCardPositions(): void {
    console.log('Saving card positions')
    if (!this.flashcardCDKService.selectedSetId()) {
      console.warn('No set selected, cannot save card positions')
      return
    }

    const selectedSetId = this.flashcardCDKService.selectedSetId()
    if (!selectedSetId) {
      console.warn('No set ID available, cannot save card positions')
      return
    }

    // Verify that the set exists in both services before proceeding
    if (!this.flashcardCDKService.verifySetExists(selectedSetId)) {
      console.error(
        `Failed to verify set ${selectedSetId} exists, cannot save card positions`,
      )
      return
    }

    const cards = this.flashcardCDKService.selectedSetCards()

    if (!cards || cards.length === 0) {
      console.warn('No cards to save positions for')
      return
    }

    // Log the card positions being saved
    console.log(
      `Saving positions for ${cards.length} cards in set ${selectedSetId}`,
    )

    // Update positions in local storage
    this.localStorageService.updateState((state: LocalStorageState) => {
      const updatedState = {
        ...state,
        flashcardSets: state.flashcardSets.map((set: ValidatedFlashcardSet) => {
          if (set.id === selectedSetId) {
            // Update positions based on current order
            const updatedFlashcards = cards.map((card, index) => ({
              ...card,
              position: index,
              flashcard_set_id: selectedSetId,
            }))

            return {
              ...set,
              flashcards: updatedFlashcards,
              updated_at: new Date().toISOString(),
            }
          }
          return set
        }),
      }
      return updatedState
    })

    // Ensure we mark the set as dirty so it will be synced
    this.localStorageService.markDirty(selectedSetId)
    console.log(`Marked set ${selectedSetId} as dirty after position update`)

    // Also update in FlashcardService
    this.flashcardCDKService.saveSelectedSet()
  }

  // Implement debug methods
  resetLocalStorage(): void {
    if (
      confirm(
        'Are you sure you want to reset all flashcard data? This cannot be undone.',
      )
    ) {
      this.localStorageService.resetState()
      alert('Storage has been reset. The page will now reload.')
      window.location.reload()
    }
  }

  cleanupDuplicates(): void {
    this.localStorageService.cleanupDuplicates()
    this.flashcardCDKService.cleanupDuplicateSets()
    alert('Duplicate sets have been removed.')
  }

  clearNewCards(): void {
    this.flashcardCDKService.newFlashcards.set([])
    const selectedSetId = this.flashcardCDKService.selectedSetId()
    if (selectedSetId) {
      this.localStorageService.markDirty(selectedSetId)
    }
  }
}
