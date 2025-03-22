import { Injectable, signal } from '@angular/core'
import {
  FlashcardSetWithCards,
  StateUpdater,
  ValidatedFlashcard,
  ValidatedFlashcardSet,
} from '../../models/flashcards.models'

export interface LocalStorageState {
  readonly flashcardSets: ValidatedFlashcardSet[]
}

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private readonly STORAGE_KEY = 'flashcard_data'
  private readonly DIRTY_KEY = 'dirty_items'
  public readonly state = signal<LocalStorageState>({
    flashcardSets: [],
  })
  private dirtyItems = signal<ReadonlyArray<string>>([])

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as LocalStorageState
      this.validateAndSetState(parsed)
    }
  }

  /**
   * Get a specific item from localStorage by key
   */
  getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    if (!item) return null
    try {
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Error parsing item from localStorage: ${key}`, error)
      return null
    }
  }

  /**
   * Set an item in localStorage with the given key
   */
  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error storing item in localStorage: ${key}`, error)
    }
  }

  /**
   * Remove an item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key)
  }

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    localStorage.clear()
  }

  // Legacy methods below for backward compatibility

  private validateAndSetState(state: LocalStorageState): void {
    // Ensure all cards have positions and set IDs
    const validatedState: LocalStorageState = {
      flashcardSets: state.flashcardSets.map((set) => ({
        ...set,
        flashcards: set.flashcards.map(
          (card, index): ValidatedFlashcard => ({
            ...card,
            position: index,
            flashcard_set_id: set.id,
          }),
        ),
      })),
    }
    this.state.set(validatedState)
  }

  getState(): Readonly<LocalStorageState> {
    return this.state()
  }

  /**
   * Update state with validation to prevent duplicate sets
   */
  updateState(updater: StateUpdater): void {
    this.state.update((current) => {
      const newState = updater(current)

      // Check for and remove duplicate sets
      const uniqueSets: ValidatedFlashcardSet[] = []
      const seenIds = new Set<string>()

      newState.flashcardSets.forEach((set) => {
        if (!seenIds.has(set.id)) {
          seenIds.add(set.id)
          uniqueSets.push(set)
        } else {
          console.warn(
            `Prevented duplicate set with ID ${set.id} from being added to localStorage`,
          )
        }
      })

      // Validate and ensure position tracking
      const validatedState: LocalStorageState = {
        flashcardSets: uniqueSets.map((set) => ({
          ...set,
          flashcards: set.flashcards.map(
            (card, index): ValidatedFlashcard => ({
              ...card,
              position: index,
              flashcard_set_id: set.id,
            }),
          ),
        })),
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validatedState))
      return validatedState
    })
  }

  markDirty(itemId: string): void {
    console.log(`Marking item as dirty: ${itemId}`)
    this.dirtyItems.update((items) =>
      items.includes(itemId) ? items : [...items, itemId],
    )
  }

  getDirtyItems(): ReadonlyArray<string> {
    return this.dirtyItems()
  }

  clearDirtyItems(itemIds: ReadonlyArray<string>): void {
    this.dirtyItems.update((items) =>
      items.filter((id) => !itemIds.includes(id)),
    )
  }

  /**
   * Updates local state with data from the API
   * @param apiResponse The flashcard sets received from the API
   */
  loadFromApi(apiResponse: FlashcardSetWithCards[]): void {
    console.log(`Local storage: loading ${apiResponse.length} sets from API`)

    // Always update state, even if response is empty
    // This ensures we properly clear local data when the server has no sets
    this.updateState(() => ({
      flashcardSets: apiResponse.map((set) => ({
        ...set,
        flashcards: set.flashcards.map(
          (card, index): ValidatedFlashcard => ({
            ...card,
            position: index,
            flashcard_set_id: set.id,
          }),
        ),
      })),
    }))

    // Reset dirty items when loading from API
    // This prevents syncing items we just loaded
    this.dirtyItems.set([])

    // Also save to the new format
    this.setItem('flashcardSets', apiResponse)

    console.log('Local storage updated with API data')
  }

  removeSet(setId: string): void {
    this.updateState((current) => ({
      flashcardSets: current.flashcardSets.filter((set) => set.id !== setId),
    }))
  }

  /**
   * Resets the application state to default (empty sets)
   */
  resetState(): void {
    console.log('Resetting application state to default')

    // Create an empty state
    const emptyState: LocalStorageState = {
      flashcardSets: [],
    }

    // Update localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(emptyState))

    // Clear dirty items
    localStorage.removeItem(this.DIRTY_KEY)

    // Update the signal
    this.state.set(emptyState)
    this.dirtyItems.set([])

    console.log('Application state has been reset')
  }

  /**
   * Cleans up any duplicate sets in the state
   */
  cleanupDuplicates(): void {
    console.log('Cleaning up duplicate sets')

    const currentState = this.getState()
    const uniqueIds = new Set<string>()
    const uniqueSets: ValidatedFlashcardSet[] = []

    currentState.flashcardSets.forEach((set) => {
      if (!uniqueIds.has(set.id)) {
        uniqueIds.add(set.id)
        uniqueSets.push(set)
      } else {
        console.warn(`Removed duplicate set with ID: ${set.id}`)
      }
    })

    // If we found and removed duplicates, update the state
    if (uniqueSets.length < currentState.flashcardSets.length) {
      console.log(
        `Removed ${
          currentState.flashcardSets.length - uniqueSets.length
        } duplicate sets`,
      )

      const cleanState: LocalStorageState = {
        flashcardSets: uniqueSets,
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanState))
      this.state.set(cleanState)
    } else {
      console.log('No duplicates found')
    }
  }
}
