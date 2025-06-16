import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { FlashcardsService } from '../api/services/FlashcardsService'
import {
  FlashcardSetWithCards,
  CreateFlashcardSetDto,
  CreateFlashcardDto,
  UpdateFlashcardDto,
  UpdateFlashcardSetDto,
} from '../api'
import { LocalStorageService } from '../services/state/local-storage.service'
import { HttpClient } from '@angular/common/http'

/**
 * @FlashcardService
 *
 * This service manages flashcard sets and their synchronization with the backend.
 * Uses the OpenAPI-generated services with proper configuration.
 */
@Injectable({
  providedIn: 'root',
})
export class FlashcardService {
  private readonly localStorageService = inject(LocalStorageService)
  private readonly apiService = inject(FlashcardsService)
  private readonly http = inject(HttpClient)

  getFlashcardSets(): Observable<FlashcardSetWithCards[]> {
    return this.apiService.getFlashcardSets()
  }

  getFlashcardSet(id: string): Observable<FlashcardSetWithCards> {
    return this.apiService.getFlashcardSet(id)
  }

  createFlashcardSet(
    dto: CreateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.createFlashcardSet(dto)
  }

  updateFlashcardSet(
    id: string,
    dto: UpdateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.updateFlashcardSet(id, dto)
  }

  deleteFlashcardSet(id: string): Observable<void> {
    return this.apiService.deleteFlashcardSet(id)
  }

  createCard(
    dto: CreateFlashcardDto,
    setId: string,
  ): Observable<FlashcardSetWithCards> {
    console.log(`Creating card in set ${setId}:`, dto)
    // Ensure setId is properly set in the DTO
    const cardDto = {
      ...dto,
      setId: setId,
    }
    return this.apiService.createCard(cardDto)
  }

  updateCard(
    id: string,
    dto: UpdateFlashcardDto,
    setId: string,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.updateCard(id, dto)
  }

  deleteCard(id: string, setId: string): Observable<void> {
    return this.apiService.deleteCard(id)
  }

  updateSet(
    setId: string,
    updateDto: UpdateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.updateFlashcardSet(setId, updateDto)
  }

  syncToBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      const state = this.localStorageService.getState()
      if (!state?.flashcardSets) {
        resolve()
        return
      }

      // Get all the dirty items that need to be synced
      const dirtyItemIds = this.localStorageService.getDirtyItems()
      if (dirtyItemIds.length === 0) {
        console.log('No dirty items to sync')
        resolve()
        return
      }

      console.log(`Syncing ${dirtyItemIds.length} dirty sets:`, dirtyItemIds)

      // Debug: Log all sets in storage to identify the mismatch
      console.log(
        'All sets in storage:',
        state.flashcardSets.map((s) => ({ id: s.id, title: s.title })),
      )

      // Only include sets that are dirty (have changes that need syncing)
      const dirtyStoredSets = state.flashcardSets.filter((set) =>
        dirtyItemIds.includes(set.id),
      )
      console.log(
        `Found ${dirtyStoredSets.length} dirty sets in storage:`,
        dirtyStoredSets.map((s) => ({
          id: s.id,
          cardCount: s.flashcards.length,
        })),
      )

      // Clean up orphaned dirty items (dirty IDs that don't correspond to actual sets)
      const validSetIds = state.flashcardSets.map((set) => set.id)
      const orphanedDirtyIds = dirtyItemIds.filter(
        (id) => !validSetIds.includes(id),
      )
      if (orphanedDirtyIds.length > 0) {
        console.warn(
          'Found orphaned dirty items, cleaning up:',
          orphanedDirtyIds,
        )
        this.localStorageService.clearDirtyItems(orphanedDirtyIds)

        // After cleanup, check if we have any remaining valid dirty sets
        const remainingDirtyIds = dirtyItemIds.filter((id) =>
          validSetIds.includes(id),
        )
        if (remainingDirtyIds.length === 0) {
          console.log(
            'No valid dirty sets remaining after cleanup, sync complete',
          )
          resolve()
          return
        }
        console.log(
          'Proceeding with sync for remaining valid dirty sets:',
          remainingDirtyIds,
        )
      }

      // Get dirty cards for efficient syncing
      const dirtyCards = this.localStorageService.getDirtyCards()

      const flashcardSets = dirtyStoredSets.map((set) => {
        const setDirtyCards = dirtyCards[set.id] || []

        // If no specific cards are dirty, sync all cards (new set or full set change)
        const cardsToSync =
          setDirtyCards.length > 0
            ? set.flashcards.filter((card) => setDirtyCards.includes(card.id))
            : set.flashcards

        console.log(
          `Set ${set.title}: syncing ${cardsToSync.length} of ${set.flashcards.length} cards`,
          setDirtyCards.length > 0 ? 'Dirty cards:' : 'All cards (new set)',
          setDirtyCards.length > 0 ? setDirtyCards : 'N/A',
        )

        return {
          ...set,
          // Convert null to undefined for optional fields
          description: set.description || undefined,
          iconId: set.iconId || undefined,
          setPosition: set.setPosition || undefined,
          flashcards: cardsToSync.map((card) => ({
            ...card,
            // Generate proper UUID for temp IDs
            id: card.id.startsWith('temp_') ? crypto.randomUUID() : card.id,
            position: set.flashcards.findIndex((c) => c.id === card.id), // Keep original position
            difficulty:
              (card.difficulty as any)?.value ?? card.difficulty ?? undefined,
            tags: card.tags || undefined,
            // Ensure required properties exist
            front: card.front || '',
            back: card.back || '',
          })),
        }
      }) as FlashcardSetWithCards[]

      console.log(
        `Prepared ${flashcardSets.length} sets for sync:`,
        flashcardSets.map((s) => ({
          id: s.id,
          title: s.title,
          cardCount: s.flashcards.length,
          hasCards: s.flashcards.length > 0,
        })),
      )

      if (flashcardSets.length === 0) {
        console.log('No valid sets to sync after filtering')
        resolve()
        return
      }

      console.log('Sending sync data for dirty sets:', flashcardSets)
      console.log('About to call backend sync API...')
      console.log('API base URL:', (this.apiService as any).http)
      console.log('Auth token present:', !!localStorage.getItem('auth_token'))

      // Send only the dirty flashcard sets to the API
      this.apiService.syncFlashcardSets(flashcardSets).subscribe({
        next: (response) => {
          console.log('✅ Backend sync successful!', response)
          console.log(`✅ Synced ${response.length} sets to database`)

          // Update local storage with the response from backend
          this.localStorageService.updateState((currentState) => ({
            ...currentState,
            flashcardSets: response,
          }))

          // Clear the dirty flags since we've successfully synced
          this.localStorageService.clearDirtyItems(dirtyItemIds)
          this.localStorageService.clearDirtyCards([...dirtyItemIds])
          console.log(`✅ Cleared dirty flags for: ${dirtyItemIds.join(', ')}`)
          resolve()
        },
        error: (error) => {
          console.error('❌ Backend sync failed:', error)
          console.error('❌ Error status:', error.status)
          console.error('❌ Error message:', error.message)
          // Log the specific error details for debugging
          if (error?.error) {
            console.error('❌ Error details:', error.error)
          }
          reject(error)
        },
      })
    })
  }

  getDirtyItems(): readonly string[] {
    return this.localStorageService.getDirtyItems()
  }
}
