import { Injectable, signal } from '@angular/core'
import { Flashcard, FlashcardSetWithCards } from '../../api'
import { LocalStorageState, StateUpdater } from '../../models/state.models'
import { Subject } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private readonly STORAGE_KEY = 'flashcard_app_state'
  private readonly DIRTY_KEY = 'dirty_items'
  public readonly state = signal<LocalStorageState>({
    isDarkMode: false,
    isCardView: false,
    hasCompletedTutorial: false,
    isFirstVisit: true,
    flashcardSets: [],
    currentSetId: null,
  })
  private dirtyItems = signal<ReadonlyArray<string>>([])

  // Subject to notify subscribers when state changes
  public readonly stateChanged$ = new Subject<LocalStorageState>()

  constructor() {
    this.loadFromStorage()
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

  private validateAndSetState(state: Partial<LocalStorageState>): void {
    const validatedState: LocalStorageState = {
      isDarkMode: state.isDarkMode ?? false,
      isCardView: state.isCardView ?? false,
      hasCompletedTutorial: state.hasCompletedTutorial ?? false,
      isFirstVisit: state.isFirstVisit ?? true,
      currentSetId: state.currentSetId ?? null,
      flashcardSets: (state.flashcardSets ?? []).map(
        (set: FlashcardSetWithCards) => ({
          ...set,
          flashcards: set.flashcards.map((card: Flashcard, index: number) => ({
            ...card,
            position: index,
            setId: set.id,
          })),
        }),
      ),
    }
    this.state.set(validatedState)
  }

  getState(): Readonly<LocalStorageState> {
    return this.state()
  }

  updateState(updater: StateUpdater): void {
    this.state.update((current: LocalStorageState) => {
      const newState = updater(current)
      const validatedState: LocalStorageState = {
        ...newState,
        flashcardSets: newState.flashcardSets.map(
          (set: FlashcardSetWithCards) => ({
            ...set,
            flashcards: set.flashcards.map(
              (card: Flashcard, index: number) => ({
                ...card,
                position: index,
                setId: set.id,
              }),
            ),
          }),
        ),
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validatedState))

      // Notify subscribers that state has changed
      this.stateChanged$.next(validatedState)

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
    this.updateState((current: LocalStorageState) => ({
      ...current,
      flashcardSets: apiResponse.map((set: FlashcardSetWithCards) => ({
        ...set,
        flashcards: set.flashcards.map((card: Flashcard, index: number) => ({
          ...card,
          position: index,
          setId: set.id,
        })),
      })),
    }))

    this.setItem('flashcardSets', apiResponse)
  }

  removeSet(setId: string): void {
    this.updateState((current: LocalStorageState) => {
      // Filter out the deleted set
      const updatedSets = current.flashcardSets.filter(
        (set: FlashcardSetWithCards) => set.id !== setId,
      )

      // Update currentSetId if the deleted set was the current one
      const updatedCurrentSetId =
        current.currentSetId === setId
          ? updatedSets.length > 0
            ? updatedSets[0].id
            : null
          : current.currentSetId

      return {
        ...current,
        flashcardSets: updatedSets,
        currentSetId: updatedCurrentSetId,
      }
    })

    // Mark item as dirty for syncing
    this.markDirty(setId)
  }

  resetState(): void {
    this.state.set({
      isDarkMode: false,
      isCardView: false,
      hasCompletedTutorial: false,
      isFirstVisit: true,
      flashcardSets: [],
      currentSetId: null,
    })
    this.clear()
  }

  cleanupDuplicates(): void {
    this.updateState((current: LocalStorageState) => ({
      ...current,
      flashcardSets: current.flashcardSets.filter(
        (
          set: FlashcardSetWithCards,
          index: number,
          self: Array<FlashcardSetWithCards>,
        ) =>
          index ===
          self.findIndex((s: FlashcardSetWithCards) => s.id === set.id),
      ),
    }))
  }

  private loadFromStorage(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as LocalStorageState
      this.validateAndSetState(parsed)
    }
  }
}
