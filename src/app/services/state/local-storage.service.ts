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

  updateState(updater: StateUpdater): void {
    this.state.update((current) => {
      const newState = updater(current)
      // Validate and ensure position tracking
      const validatedState: LocalStorageState = {
        flashcardSets: newState.flashcardSets.map((set) => ({
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

  loadFromApi(apiResponse: FlashcardSetWithCards[]): void {
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

    // Also save to the new format
    this.setItem('flashcardSets', apiResponse)
  }

  removeSet(setId: string): void {
    this.updateState((current) => ({
      flashcardSets: current.flashcardSets.filter((set) => set.id !== setId),
    }))
  }

  resetState(): void {
    this.state.set({ flashcardSets: [] })
    this.clear()
  }

  cleanupDuplicates(): void {
    this.updateState((current) => ({
      flashcardSets: current.flashcardSets.filter(
        (set, index, self) => index === self.findIndex((s) => s.id === set.id),
      ),
    }))
  }
}
