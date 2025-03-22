import { Injectable, computed, inject, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../environments/environment'
import { catchError, firstValueFrom, of, tap } from 'rxjs'
import {
  FlashcardSet,
  FlashcardSetWithCards,
  ValidatedFlashcardSet,
} from '../models/flashcards.models'
import { LocalStorageService } from './state/local-storage.service'

/**
 * @FlashcardService
 *
 * This service manages flashcard sets and their synchronization with the backend.
 */
@Injectable({
  providedIn: 'root',
})
export class FlashcardService {
  private flashcardSets = signal<ReadonlyArray<FlashcardSetWithCards>>([])
  public sets = computed(() => this.flashcardSets())
  private readonly apiUrl = `${environment.apiUrl}/flashcards`

  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly http: HttpClient,
  ) {
    this.loadFromLocalStorage()
  }

  private loadFromLocalStorage(): void {
    // Try to get from new format first
    const sets = this.localStorageService.getItem<FlashcardSetWithCards[]>(
      'flashcardSets',
    )
    if (sets) {
      this.flashcardSets.set(sets)
      return
    }

    // Fall back to legacy format
    const state = this.localStorageService.getState()
    if (state.flashcardSets.length > 0) {
      this.flashcardSets.set(state.flashcardSets)
    }
  }

  /**
   * Synchronize all flashcard sets to the backend
   */
  async syncToBackend(): Promise<void> {
    const sets = this.sets()

    try {
      // Save to localStorage as backup
      this.localStorageService.setItem('flashcardSets', sets)

      // Get only the dirty items
      const dirtyItemIds = this.localStorageService.getDirtyItems()
      console.log('Dirty item IDs:', dirtyItemIds)

      if (dirtyItemIds.length === 0) {
        console.log('No dirty items to sync')
        return
      }

      const dirtyItems = sets.filter((set) => dirtyItemIds.includes(set.id))
      console.log('Dirty items to sync:', dirtyItems)

      // Format payload as expected by backend
      const payload = { sets: dirtyItems }
      console.log('Sending payload to backend:', payload)
      console.log('API URL:', `${this.apiUrl}/sync`)

      // Send dirty items to backend
      const response = await firstValueFrom(
        this.http
          .post<FlashcardSetWithCards[]>(`${this.apiUrl}/sync`, payload)
          .pipe(
            tap((response) => {
              console.log('Sync successful:', response)
              // Clear dirty items after successful sync
              this.localStorageService.clearDirtyItems(dirtyItemIds)
            }),
            catchError((error) => {
              console.error('Sync failed:', error)

              // Check for authentication errors specifically
              if (error.status === 401 || error.status === 403) {
                console.error('Authentication error:', error)
                throw new Error(
                  'User not authenticated. Please log in to save your cards.',
                )
              }

              // Network or server errors
              if (error.status === 0) {
                throw new Error(
                  'Network error. Please check your connection and try again.',
                )
              }

              // Other API errors with response
              if (error.error?.message) {
                throw new Error(`API error: ${error.error.message}`)
              }

              // Default error case
              throw error
            }),
          ),
      )

      return
    } catch (error) {
      console.error('Error syncing to backend:', error)
      throw error // Re-throw to be handled by the caller
    }
  }

  /**
   * Load flashcard sets from backend
   * @returns The loaded flashcard sets
   */
  async loadFromBackend(): Promise<FlashcardSetWithCards[]> {
    try {
      console.log('Loading flashcards from backend:', `${this.apiUrl}`)

      const response = await firstValueFrom(
        this.http.get<FlashcardSetWithCards[]>(`${this.apiUrl}`).pipe(
          catchError((error) => {
            console.error('Failed to load flashcards from backend:', error)

            // Check for authentication errors specifically
            if (error.status === 401 || error.status === 403) {
              console.error('Authentication error while loading:', error)
              // Return empty array instead of throwing to handle gracefully
              return of([])
            }

            // Network or server errors
            if (error.status === 0) {
              console.error('Network error while loading flashcards')
              return of([])
            }

            return of([])
          }),
        ),
      )

      console.log('Response from backend:', response)

      // Always update the flashcardSets, even if empty
      // This ensures we properly handle the case where the user has no sets yet
      this.flashcardSets.set(response)
      this.localStorageService.loadFromApi(response)

      // Log how many sets were loaded
      console.log(`Loaded ${response.length} flashcard sets from backend`)

      // Return the response in case we want to use it
      return response
    } catch (error) {
      console.error('Error loading flashcards from backend:', error)
      // Return an empty array to indicate no data was loaded
      return []
    }
  }

  /**
   * Method alias for backward compatibility
   */
  async syncToSupabase(): Promise<void> {
    return this.syncToBackend()
  }

  /**
   * Gets a flashcard set by ID
   */
  getFlashcardSet(id: string): FlashcardSetWithCards | undefined {
    return this.sets().find((set) => set.id === id)
  }

  /**
   * Updates or adds a flashcard set
   */
  addFlashcardSet(newSet: FlashcardSet): void {
    const setWithCards: FlashcardSetWithCards = {
      ...newSet,
      flashcards: [],
    }

    this.flashcardSets.update((current) => [...current, setWithCards])
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: [
        ...state.flashcardSets,
        setWithCards as ValidatedFlashcardSet,
      ],
    }))
    this.localStorageService.markDirty(newSet.id)
    this.localStorageService.setItem('flashcardSets', this.sets())
  }

  /**
   * Updates or adds a flashcard set
   */
  updateFlashcardSet(updatedSet: FlashcardSetWithCards): void {
    this.flashcardSets.update((current) =>
      current.map((set) => (set.id === updatedSet.id ? updatedSet : set)),
    )
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === updatedSet.id ? (updatedSet as ValidatedFlashcardSet) : set,
      ),
    }))
    this.localStorageService.markDirty(updatedSet.id)
    this.localStorageService.setItem('flashcardSets', this.sets())
  }

  /**
   * Deletes a flashcard set
   */
  deleteFlashcardSet(id: string): void {
    this.flashcardSets.update((current) =>
      current.filter((set) => set.id !== id),
    )
    this.localStorageService.removeSet(id)
    this.localStorageService.setItem('flashcardSets', this.sets())

    // Also delete from backend
    this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to delete flashcard set from backend:', error)
          return of(null)
        }),
      )
      .subscribe()
  }

  // Add a method to get dirty items from the LocalStorageService
  getDirtyItems(): ReadonlyArray<string> {
    return this.localStorageService.getDirtyItems()
  }
}
