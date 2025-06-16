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
  private readonly DIRTY_CARDS_KEY = 'dirty_cards'
  public readonly state = signal<LocalStorageState>({
    isDarkMode: false,
    isCardView: false,
    hasCompletedTutorial: false,
    isFirstVisit: true,
    flashcardSets: [],
    currentSetId: null,
  })
  private dirtyItems = signal<ReadonlyArray<string>>([])
  // Track dirty flashcards: { setId: string[], ... }
  private dirtyCards = signal<Record<string, string[]>>({})

  // Subject to notify subscribers when state changes
  public readonly stateChanged$ = new Subject<LocalStorageState>()

  constructor() {
    this.loadFromStorage()
    this.loadDirtyItems()
    this.loadDirtyCards()
    this.cleanupOrphanedDirtyItems()
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
    this.dirtyItems.update((items) => {
      const newItems = items.includes(itemId) ? items : [...items, itemId]
      // Persist dirty items to localStorage
      localStorage.setItem(this.DIRTY_KEY, JSON.stringify(newItems))
      return newItems
    })
  }

  getDirtyItems(): ReadonlyArray<string> {
    return this.dirtyItems()
  }

  clearDirtyItems(itemIds: ReadonlyArray<string>): void {
    this.dirtyItems.update((items) => {
      const filteredItems = items.filter((id) => !itemIds.includes(id))
      // Persist updated dirty items to localStorage
      localStorage.setItem(this.DIRTY_KEY, JSON.stringify(filteredItems))
      return filteredItems
    })
  }

  markCardDirty(setId: string, cardId: string): void {
    this.dirtyCards.update((cards) => {
      const newCards = { ...cards }
      if (!newCards[setId]) {
        newCards[setId] = []
      }
      if (!newCards[setId].includes(cardId)) {
        newCards[setId] = [...newCards[setId], cardId]
      }
      // Persist dirty cards to localStorage
      localStorage.setItem(this.DIRTY_CARDS_KEY, JSON.stringify(newCards))
      // Also mark the set as dirty
      this.markDirty(setId)
      return newCards
    })
  }

  getDirtyCards(): Record<string, string[]> {
    return this.dirtyCards()
  }

  clearDirtyCards(setIds: string[]): void {
    this.dirtyCards.update((cards) => {
      const newCards = { ...cards }
      setIds.forEach((setId) => {
        delete newCards[setId]
      })
      // Persist updated dirty cards to localStorage
      localStorage.setItem(this.DIRTY_CARDS_KEY, JSON.stringify(newCards))
      return newCards
    })
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
    this.dirtyItems.set([])
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

  private loadDirtyItems(): void {
    const saved = localStorage.getItem(this.DIRTY_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        this.dirtyItems.set(parsed)
      } catch (error) {
        console.error('Error parsing dirty items from localStorage:', error)
        this.dirtyItems.set([])
      }
    }
  }

  private loadDirtyCards(): void {
    const saved = localStorage.getItem(this.DIRTY_CARDS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, string[]>
        this.dirtyCards.set(parsed)
      } catch (error) {
        console.error('Error parsing dirty cards from localStorage:', error)
        this.dirtyCards.set({})
      }
    }
  }

  /**
   * Clean up any orphaned dirty items that don't correspond to actual sets
   * This should be called on initialization to clean up any leftover dirty items
   */
  private cleanupOrphanedDirtyItems(): void {
    const currentState = this.getState()
    const validSetIds = currentState.flashcardSets.map((set) => set.id)
    const currentDirtyItems = this.getDirtyItems()
    const orphanedItems = currentDirtyItems.filter(
      (id) => !validSetIds.includes(id),
    )

    if (orphanedItems.length > 0) {
      console.warn(
        'Found orphaned dirty items during initialization, cleaning up:',
        orphanedItems,
      )
      this.clearDirtyItems(orphanedItems)
    }
  }

  /**
   * Force clear all dirty items (useful for debugging)
   */
  clearAllDirtyItems(): void {
    this.dirtyItems.set([])
    localStorage.removeItem(this.DIRTY_KEY)
    console.log('Cleared all dirty items')
  }
}
