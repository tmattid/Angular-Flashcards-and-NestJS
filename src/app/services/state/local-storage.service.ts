import { Injectable, signal } from '@angular/core'
import { Flashcard, FlashcardSetWithCards } from '../../api'
import { LocalStorageState, StateUpdater } from '../../models/state.models'
import { Subject } from 'rxjs'
import { DatabaseService } from './database.service'

interface UndoSnapshot {
  id: string
  timestamp: Date
  setId: string
  operation: string
  description: string
  previousState: FlashcardSetWithCards
}

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private readonly STORAGE_KEY = 'flashcard_app_state'
  private readonly DIRTY_KEY = 'dirty_items'
  private readonly DIRTY_CARDS_KEY = 'dirty_cards'
  private readonly UNDO_KEY = 'undo_snapshots'
  private readonly MAX_UNDO_HISTORY = 5

  public readonly state = signal<LocalStorageState>({
    isDarkMode: false,
    isCardView: false,
    hasCompletedTutorial: false,
    isFirstVisit: true,
    flashcardSets: [],
    currentSetId: null,
  })
  private dirtyItems = signal<readonly string[]>([])
  // Track dirty flashcards: { setId: string[], ... }
  private dirtyCards = signal<Record<string, string[]>>({})
  private undoSnapshots = signal<UndoSnapshot[]>([])

  // Subject to notify subscribers when state changes
  public readonly stateChanged$ = new Subject<LocalStorageState>()

  constructor(private db: DatabaseService) {
    this.initializeFromDatabase()
  }

  private async initializeFromDatabase(): Promise<void> {
    await this.loadFromStorage()
    await this.loadDirtyItems()
    await this.loadDirtyCards()
    await this.loadUndoSnapshots()
    await this.cleanupOrphanedDirtyItems()
  }

  /**
   * Get a specific item from IndexedDB by key
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await this.db.getAppState(key)
      return value as T
    } catch (error) {
      console.error(`Error getting item from IndexedDB: ${key}`, error)
      return null
    }
  }

  /**
   * Set an item in IndexedDB with the given key
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await this.db.setAppState(key, value)
    } catch (error) {
      console.error(`Error storing item in IndexedDB: ${key}`, error)
    }
  }

  /**
   * Remove an item from IndexedDB
   */
  async removeItem(key: string): Promise<void> {
    await this.db.removeAppState(key)
  }

  /**
   * Clear all items from IndexedDB
   */
  async clear(): Promise<void> {
    await this.db.clearAllData()
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

  async updateState(updater: StateUpdater): Promise<void> {
    const current = this.state()
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
    
    await this.db.setAppState(this.STORAGE_KEY, validatedState)
    this.state.set(validatedState)
    
    // Notify subscribers that state has changed
    this.stateChanged$.next(validatedState)
  }

  async markDirty(itemId: string): Promise<void> {
    await this.db.markItemDirty(itemId, 'set')
    const dirtyItems = await this.db.getDirtyItems()
    this.dirtyItems.set(dirtyItems)
  }

  getDirtyItems(): readonly string[] {
    return this.dirtyItems()
  }

  async clearDirtyItems(itemIds: readonly string[]): Promise<void> {
    await this.db.clearDirtyItems([...itemIds])
    const remainingItems = await this.db.getDirtyItems()
    this.dirtyItems.set(remainingItems)
  }

  async markCardDirty(setId: string, cardId: string): Promise<void> {
    await this.db.markCardDirty(setId, cardId)
    const dirtyCards = await this.db.getDirtyCards()
    this.dirtyCards.set(dirtyCards)
  }

  getDirtyCards(): Record<string, string[]> {
    return this.dirtyCards()
  }

  async clearDirtyCards(setIds: string[]): Promise<void> {
    await this.db.clearDirtyCards(setIds)
    const remainingCards = await this.db.getDirtyCards()
    this.dirtyCards.set(remainingCards)
  }

  async loadFromApi(apiResponse: FlashcardSetWithCards[]): Promise<void> {
    await this.updateState((current: LocalStorageState) => ({
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

    await this.setItem('flashcardSets', apiResponse)
  }

  async removeSet(setId: string): Promise<void> {
    await this.updateState((current: LocalStorageState) => {
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
    await this.markDirty(setId)
  }

  async resetState(): Promise<void> {
    this.state.set({
      isDarkMode: false,
      isCardView: false,
      hasCompletedTutorial: false,
      isFirstVisit: true,
      flashcardSets: [],
      currentSetId: null,
    })
    this.dirtyItems.set([])
    this.dirtyCards.set({})
    await this.clear()
  }

  async cleanupDuplicates(): Promise<void> {
    await this.updateState((current: LocalStorageState) => ({
      ...current,
      flashcardSets: current.flashcardSets.filter(
        (
          set: FlashcardSetWithCards,
          index: number,
          self: FlashcardSetWithCards[],
        ) =>
          index ===
          self.findIndex((s: FlashcardSetWithCards) => s.id === set.id),
      ),
    }))
  }

  private async loadFromStorage(): Promise<void> {
    // First try to migrate from localStorage if needed
    await this.migrateFromLocalStorage()
    
    const saved = await this.db.getAppState(this.STORAGE_KEY)
    if (saved) {
      this.validateAndSetState(saved as LocalStorageState)
    }
  }

  private async loadDirtyItems(): Promise<void> {
    try {
      const items = await this.db.getDirtyItems()
      this.dirtyItems.set(items)
    } catch (error) {
      console.error('Error loading dirty items from IndexedDB:', error)
      this.dirtyItems.set([])
    }
  }

  private async loadDirtyCards(): Promise<void> {
    try {
      const cards = await this.db.getDirtyCards()
      this.dirtyCards.set(cards)
    } catch (error) {
      console.error('Error loading dirty cards from IndexedDB:', error)
      this.dirtyCards.set({})
    }
  }

  /**
   * Clean up any orphaned dirty items that don't correspond to actual sets
   * This should be called on initialization to clean up any leftover dirty items
   */
  private async cleanupOrphanedDirtyItems(): Promise<void> {
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
      await this.clearDirtyItems(orphanedItems)
    }
  }

  /**
   * Force clear all dirty items (useful for debugging)
   */
  async clearAllDirtyItems(): Promise<void> {
    await this.db.clearAllDirtyItems()
    this.dirtyItems.set([])
    this.dirtyCards.set({})
    console.log('Cleared all dirty items')
  }

  /**
   * Migrate data from localStorage to IndexedDB (one-time migration)
   */
  private async migrateFromLocalStorage(): Promise<void> {
    const existingData = await this.db.getAppState(this.STORAGE_KEY)
    if (existingData) {
      // Already migrated
      return
    }

    // Check if we have data in localStorage
    const localStorageData = localStorage.getItem(this.STORAGE_KEY)
    if (localStorageData) {
      try {
        const parsed = JSON.parse(localStorageData) as LocalStorageState
        await this.db.setAppState(this.STORAGE_KEY, parsed)
        console.log('Migrated app state from localStorage to IndexedDB')
      } catch (error) {
        console.error('Error migrating app state:', error)
      }
    }

    // Migrate dirty items
    const dirtyItemsData = localStorage.getItem(this.DIRTY_KEY)
    if (dirtyItemsData) {
      try {
        const items = JSON.parse(dirtyItemsData) as string[]
        for (const itemId of items) {
          await this.db.markItemDirty(itemId, 'set')
        }
        console.log('Migrated dirty items from localStorage to IndexedDB')
      } catch (error) {
        console.error('Error migrating dirty items:', error)
      }
    }

    // Migrate dirty cards
    const dirtyCardsData = localStorage.getItem(this.DIRTY_CARDS_KEY)
    if (dirtyCardsData) {
      try {
        const cards = JSON.parse(dirtyCardsData) as Record<string, string[]>
        for (const [setId, cardIds] of Object.entries(cards)) {
          for (const cardId of cardIds) {
            await this.db.markCardDirty(setId, cardId)
          }
        }
        console.log('Migrated dirty cards from localStorage to IndexedDB')
      } catch (error) {
        console.error('Error migrating dirty cards:', error)
      }
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.DIRTY_KEY)
    localStorage.removeItem(this.DIRTY_CARDS_KEY)
  }

  // === UNDO FUNCTIONALITY ===

  /**
   * Save a snapshot before making changes to a set
   */
  async saveUndoSnapshot(setId: string, operation: string, description: string): Promise<string> {
    const currentState = this.state()
    const set = currentState.flashcardSets.find(s => s.id === setId)
    
    if (!set) {
      throw new Error(`Set ${setId} not found`)
    }

    const snapshot: UndoSnapshot = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      setId,
      operation,
      description,
      previousState: JSON.parse(JSON.stringify(set)) // Deep clone
    }

    // Add to beginning of array and limit history
    const currentSnapshots = this.undoSnapshots()
    const newSnapshots = [snapshot, ...currentSnapshots].slice(0, this.MAX_UNDO_HISTORY)
    
    this.undoSnapshots.set(newSnapshots)
    await this.saveUndoSnapshots()
    
    console.log(`💾 Saved undo snapshot: ${description}`)
    return snapshot.id
  }

  /**
   * Undo the last change for a specific set
   */
  async undoLastChange(setId: string): Promise<{ success: boolean; message: string }> {
    const snapshots = this.undoSnapshots()
    
    // Find the most recent snapshot for this set (sort by timestamp descending)
    const setSnapshots = snapshots
      .filter(s => s.setId === setId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    const snapshot = setSnapshots[0]
    
    if (!snapshot) {
      return { success: false, message: 'No changes to undo' }
    }

    try {
      console.log(`🔄 Undoing snapshot:`, {
        id: snapshot.id,
        operation: snapshot.operation,
        description: snapshot.description,
        timestamp: snapshot.timestamp,
        cardsInSnapshot: snapshot.previousState.flashcards.length
      })

      // Restore the set to its previous state
      await this.updateState(state => ({
        ...state,
        flashcardSets: state.flashcardSets.map(set =>
          set.id === setId ? snapshot.previousState : set
        )
      }))

      // Remove the snapshot after successful undo
      const remainingSnapshots = snapshots.filter(s => s.id !== snapshot.id)
      this.undoSnapshots.set(remainingSnapshots)
      await this.saveUndoSnapshots()

      console.log(`↩️ Successfully undid: ${snapshot.description}`)
      return { 
        success: true, 
        message: `Undid "${snapshot.description}"` 
      }
    } catch (error) {
      console.error('Error during undo:', error)
      return { 
        success: false, 
        message: 'Failed to undo changes' 
      }
    }
  }

  /**
   * Check if undo is available for a set
   */
  canUndo(setId: string): boolean {
    return this.undoSnapshots().some(s => s.setId === setId)
  }

  /**
   * Get undo history for a set
   */
  getUndoHistory(setId: string): UndoSnapshot[] {
    return this.undoSnapshots().filter(s => s.setId === setId)
  }

  /**
   * Clear all undo history
   */
  async clearUndoHistory(setId?: string): Promise<void> {
    if (setId) {
      const filtered = this.undoSnapshots().filter(s => s.setId !== setId)
      this.undoSnapshots.set(filtered)
    } else {
      this.undoSnapshots.set([])
    }
    await this.saveUndoSnapshots()
  }

  private async loadUndoSnapshots(): Promise<void> {
    try {
      const snapshots = await this.getItem<UndoSnapshot[]>(this.UNDO_KEY)
      if (snapshots) {
        // Convert timestamp strings back to Date objects
        const parsedSnapshots = snapshots.map(s => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }))
        this.undoSnapshots.set(parsedSnapshots)
      }
    } catch (error) {
      console.error('Error loading undo snapshots:', error)
    }
  }

  private async saveUndoSnapshots(): Promise<void> {
    try {
      await this.setItem(this.UNDO_KEY, this.undoSnapshots())
    } catch (error) {
      console.error('Error saving undo snapshots:', error)
    }
  }
}
