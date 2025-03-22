import { Injectable, inject, signal, computed } from '@angular/core'
import { LocalStorageService } from '../../services/state/local-storage.service'
import {
  Flashcard,
  FlashcardSetWithCards,
} from '../../models/flashcards.models'
import { Observable, of } from 'rxjs'
import { FlashcardService } from '../../services/flashcard-http.service'

@Injectable({
  providedIn: 'root',
})
export class FlashcardCDKService {
  private readonly localStorageService = inject(LocalStorageService)
  private readonly flashcardService = inject(FlashcardService)

  selectedSetCards = computed(() => {
    const setId = this.selectedSetId()
    if (!setId) return []

    const set = this.localStorageService
      .state()
      .flashcardSets.find((s) => s.id === setId)
    return set?.flashcards ?? []
  })

  newFlashcards = signal<Flashcard[]>([])
  selectedSetId = signal<string | null>(null)

  private _processedSetIds = new Set<string>()

  constructor() {
    // Clean up any duplicate sets that may exist
    this.cleanupDuplicateSets()

    // Ensure services are in sync
    this.syncServicesData()

    // Set up periodic synchronization to catch any inconsistencies
    setInterval(() => {
      this.syncServicesData()
    }, 30000) // Sync every 30 seconds

    // Initialize with first set if available
    const state = this.localStorageService.getState()
    if (state.flashcardSets.length > 0) {
      this.selectedSetId.set(state.flashcardSets[0].id)
      this.loadSet(state.flashcardSets[0].id)
    } else {
      // No sets exist at all, create a default set automatically
      console.log(
        'No flashcard sets found on initialization. Creating default set.',
      )
      const defaultSet = this.createDefaultSet()
      this.selectedSetId.set(defaultSet.id)
      this.loadSet(defaultSet.id)
    }
  }

  /**
   * Cleans up any duplicate sets in localStorage
   */
  public cleanupDuplicateSets(): void {
    console.log('Checking for duplicate sets to clean up')

    const state = this.localStorageService.getState()
    const setIds = new Set<string>()
    const uniqueSets: any[] = []
    let duplicatesFound = false

    // Filter out duplicates by ID
    state.flashcardSets.forEach((set) => {
      if (!setIds.has(set.id)) {
        setIds.add(set.id)
        uniqueSets.push(set)
      } else {
        console.warn(
          `Found duplicate set with ID ${set.id}, removing duplicate`,
        )
        duplicatesFound = true
      }
    })

    // If duplicates were found, update localStorage with clean data
    if (duplicatesFound) {
      console.log(
        `Removing ${
          state.flashcardSets.length - uniqueSets.length
        } duplicate sets`,
      )
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: uniqueSets,
      }))
      console.log('Duplicate sets removed')
    } else {
      console.log('No duplicate sets found')
    }
  }

  /**
   * Verifies that a set with the given ID exists in both services, and attempts recovery if not.
   * @param setId The set ID to verify
   * @returns True if the set exists or was recovered, false otherwise
   */
  public verifySetExists(setId: string): boolean {
    console.log(`Verifying set ${setId} exists in both services`)

    // Get current state from both services
    const localStorageSets = this.localStorageService.getState().flashcardSets
    const localStorageSet = localStorageSets.find((set) => set.id === setId)

    const flashcardSets = this.flashcardService.sets()
    const flashcardServiceSet = flashcardSets.find((set) => set.id === setId)

    // Check if set exists in both services
    const existsInLocalStorage = !!localStorageSet
    const existsInFlashcardService = !!flashcardServiceSet

    console.log(`Set ${setId} exists in LocalStorage: ${existsInLocalStorage}`)
    console.log(
      `Set ${setId} exists in FlashcardService: ${existsInFlashcardService}`,
    )

    // If we've already processed this ID and the set exists in both services, skip further processing
    if (
      this._processedSetIds.has(setId) &&
      existsInLocalStorage &&
      existsInFlashcardService
    ) {
      console.log(
        `Set ${setId} was already processed and exists in both services, skipping further verification`,
      )
      return true
    }

    // Mark this ID as processed to prevent duplicate operations
    this._processedSetIds.add(setId)

    // If set exists in both services, we're good
    if (existsInLocalStorage && existsInFlashcardService) {
      return true
    }

    // If set exists in LocalStorage but not in FlashcardService, add it to FlashcardService
    if (existsInLocalStorage && !existsInFlashcardService) {
      console.log(`Adding set ${setId} to FlashcardService from LocalStorage`)

      this.flashcardService.addFlashcardSet({
        id: localStorageSet.id,
        title: localStorageSet.title,
        description: localStorageSet.description,
        icon_id: localStorageSet.icon_id,
        created_at: localStorageSet.created_at,
        updated_at: localStorageSet.updated_at,
        set_position: localStorageSet.set_position,
        created_by: 'app-default',
      })

      // Then add flashcards by updating the newly added set
      if (localStorageSet.flashcards && localStorageSet.flashcards.length > 0) {
        const newSet = this.flashcardService.getFlashcardSet(setId)
        if (newSet) {
          const updatedNewSet = {
            ...newSet,
            flashcards: localStorageSet.flashcards,
          }
          this.flashcardService.updateFlashcardSet(updatedNewSet)
        }
      }

      return true
    }

    // If set exists in FlashcardService but not in LocalStorage, add it to LocalStorage
    if (!existsInLocalStorage && existsInFlashcardService) {
      console.log(`Adding set ${setId} to LocalStorage from FlashcardService`)

      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: [
          ...state.flashcardSets,
          {
            ...flashcardServiceSet,
            flashcards: flashcardServiceSet.flashcards.map((card, index) => ({
              ...card,
              position: index,
              flashcard_set_id: setId,
            })),
          },
        ],
      }))

      return true
    }

    // If set doesn't exist in either service, check if we already have recovery sets with the same ID
    const existingRecoverySets = localStorageSets.filter(
      (set) => set.id === setId || set.title === 'Recovered Set',
    )

    if (existingRecoverySets.length > 0) {
      console.warn(
        `Found ${existingRecoverySets.length} existing recovery sets. Not creating another one.`,
      )
      return true
    }

    // Create a new recovery set
    console.log(
      `Set ${setId} not found in either service. Creating new set with ID ${setId}.`,
    )

    const date = new Date().toISOString()
    const newSet = {
      id: setId,
      icon_id: 'tuiIconBook',
      created_at: date,
      updated_at: date,
      title: 'My Flashcards',
      description: 'Your flashcard collection',
      flashcards: [],
      set_position: this.localStorageService.getState().flashcardSets.length,
    }

    // Add to LocalStorageService
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: [
        ...state.flashcardSets,
        {
          ...newSet,
          flashcards: [],
        },
      ],
    }))

    // Add to FlashcardService
    this.flashcardService.addFlashcardSet({
      ...newSet,
      created_by: 'app-default',
    })

    console.log(`Created new set with ID ${setId}`)

    return true
  }

  loadSet(setId: string | null): void {
    if (setId) {
      // Verify the set exists before loading it
      this.verifySetExists(setId)
    }
    this.selectedSetId.set(setId)
  }

  createNewSet(
    title: string,
    icon_id: string,
  ): Observable<FlashcardSetWithCards> {
    const newSetId = crypto.randomUUID()
    const newSet: FlashcardSetWithCards = {
      id: newSetId,
      icon_id: icon_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title: title,
      description: '',
      flashcards: [],
      set_position: this.localStorageService.getState().flashcardSets.length,
    }

    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: [
        ...state.flashcardSets,
        {
          ...newSet,
          flashcards: newSet.flashcards.map((card) => ({
            ...card,
            flashcard_set_id: newSet.id,
            position: card.position,
          })),
        },
      ],
    }))

    // Select the newly created set
    this.selectedSetId.set(newSetId)
    this.loadSet(newSetId)

    return of(newSet)
  }

  /**
   * Saves the current set and ensures it's marked as dirty for syncing with backend
   */
  public saveSelectedSet(): void {
    const currentSetId = this.selectedSetId()
    if (!currentSetId) {
      console.warn('No set selected, cannot save')
      return
    }

    console.log(`Saving set with ID: ${currentSetId}`)

    // First ensure the set exists in both services
    if (!this.verifySetExists(currentSetId)) {
      console.error(`Failed to verify set ${currentSetId} exists, cannot save`)
      return
    }

    // Get the set from both services
    const localStorageSet = this.localStorageService
      .getState()
      .flashcardSets.find((set) => set.id === currentSetId)
    const currentSet = this.flashcardService.getFlashcardSet(currentSetId)

    if (!localStorageSet) {
      console.error(
        `Set ${currentSetId} still not found in LocalStorageService after verification!`,
      )
      return
    }

    if (!currentSet) {
      console.error(
        `Set ${currentSetId} still not found in FlashcardService after verification!`,
      )
      return
    }

    // Update set in both services to ensure consistency

    // 1. Get the most up-to-date flashcards from the selected set in the UI
    const selectedCards = this.selectedSetCards()

    // 2. Update FlashcardService
    const updatedSet = {
      ...currentSet,
      flashcards: selectedCards.map((card, index) => ({
        ...card,
        position: index,
        flashcard_set_id: currentSetId,
      })),
    }
    this.flashcardService.updateFlashcardSet(updatedSet)

    // 3. Update LocalStorageService
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === currentSetId
          ? {
              ...set,
              flashcards: updatedSet.flashcards,
              updated_at: new Date().toISOString(),
            }
          : set,
      ),
    }))

    // 4. Mark set as dirty for syncing
    this.localStorageService.markDirty(currentSetId)
    console.log(`Set ${currentSetId} saved and marked as dirty for syncing`)
  }

  updateCardPositions(cards: Flashcard[], type: 'new' | 'selected'): void {
    const updatedCards = cards.map((card, index) => ({
      ...card,
      position: index,
    }))
    if (type === 'new') {
      this.newFlashcards.set(updatedCards)
    } else {
      // Only update the selected set, not all sets
      const currentSetId = this.selectedSetId()
      if (currentSetId) {
        this.localStorageService.updateState((state) => ({
          ...state,
          flashcardSets: state.flashcardSets.map((set) =>
            set.id === currentSetId
              ? { ...set, flashcards: updatedCards }
              : set,
          ),
        }))

        // Mark set as dirty when positions change
        this.localStorageService.markDirty(currentSetId)
      }
    }
  }

  /**
   * Ensures that at least one flashcard set exists
   * @returns The ID of the selected set (either existing or newly created)
   */
  public ensureDefaultSetExists(): string {
    // Check if there's already a selected set
    const currentSetId = this.selectedSetId()
    if (currentSetId) {
      return currentSetId
    }

    // Check if any sets exist in storage
    const state = this.localStorageService.getState()
    if (state.flashcardSets.length > 0) {
      // Select the first set
      const firstSetId = state.flashcardSets[0].id
      this.selectedSetId.set(firstSetId)
      return firstSetId
    }

    // No sets exist, create a default set
    console.log('No flashcard set exists. Creating a default set.')
    const defaultSet = this.createDefaultSet()
    return defaultSet.id
  }

  /**
   * Creates a default flashcard set
   * @returns The newly created set
   */
  private createDefaultSet(): FlashcardSetWithCards {
    const newSetId = crypto.randomUUID()
    const date = new Date().toISOString()

    const defaultSet: FlashcardSetWithCards = {
      id: newSetId,
      icon_id: 'tuiIconBook',
      created_at: date,
      updated_at: date,
      title: 'My Flashcards',
      description: 'Default flashcard set',
      flashcards: [],
      set_position: 0,
    }

    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: [
        ...state.flashcardSets,
        {
          ...defaultSet,
          flashcards: [],
        },
      ],
    }))

    // Select the newly created set
    this.selectedSetId.set(newSetId)

    console.log('Created default set:', defaultSet)

    // Mark as dirty for syncing
    this.localStorageService.markDirty(newSetId)

    // Update FlashcardService as well
    this.flashcardService.addFlashcardSet({
      ...defaultSet,
      created_by: 'app-default',
    })

    return defaultSet
  }

  setNewFlashcards(cards: Array<{ front: string; back: string }>): void {
    console.log('FlashcardCDKService: Setting new flashcards', cards)

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      console.warn(
        'FlashcardCDKService: Empty or invalid flashcards array received',
        cards,
      )
      return
    }

    // Ensure a set exists and is selected - but don't assign to new cards yet
    const currentSetId = this.ensureDefaultSetExists()
    console.log('FlashcardCDKService: Default set ready with ID', currentSetId)

    try {
      // Create properly formatted flashcards - WITHOUT set ID for the new cards panel
      const flashcards = cards.map((card, index) => {
        if (typeof card !== 'object' || !card.front || !card.back) {
          console.warn('Invalid flashcard format:', card)
          return {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            flashcard_set_id: '', // Empty string instead of the current set ID
            front: card?.front || 'Missing front content',
            back: card?.back || 'Missing back content',
            position: index,
            difficulty: null,
            tags: null,
          }
        }

        const newCard = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          flashcard_set_id: '', // Empty string instead of the current set ID
          front: card.front,
          back: card.back,
          position: index,
          difficulty: null,
          tags: null,
        }
        return newCard
      })

      console.log('FlashcardCDKService: Created flashcards', flashcards)

      // Set the new flashcards in the new cards panel
      this.newFlashcards.set(flashcards)
      console.log(
        'FlashcardCDKService: New flashcards ready to be dragged to a set',
      )
    } catch (error) {
      console.error('Error creating flashcards:', error)
    }
  }

  /**
   * Synchronizes data between LocalStorageService and FlashcardService to ensure consistency
   */
  private syncServicesData(): void {
    console.log('Synchronizing data between services')

    // Get sets from both services
    const localStorageSets = this.localStorageService.getState().flashcardSets
    const flashcardSets = this.flashcardService.sets()

    // Log the current state
    console.log(`LocalStorage has ${localStorageSets.length} sets`)
    console.log(`FlashcardService has ${flashcardSets.length} sets`)

    // For each set in localStorage, ensure it exists in FlashcardService with correct flashcards
    for (const localSet of localStorageSets) {
      const flashcardServiceSet = flashcardSets.find(
        (s) => s.id === localSet.id,
      )

      if (!flashcardServiceSet) {
        console.log(`Adding missing set ${localSet.id} to FlashcardService`)
        this.flashcardService.addFlashcardSet({
          id: localSet.id,
          title: localSet.title,
          description: localSet.description,
          icon_id: localSet.icon_id,
          created_at: localSet.created_at,
          updated_at: localSet.updated_at,
          set_position: localSet.set_position,
          created_by: 'app-default',
        })

        // Now add all flashcards to the newly created set
        if (localSet.flashcards && localSet.flashcards.length > 0) {
          console.log(
            `Adding ${localSet.flashcards.length} flashcards to set ${localSet.id}`,
          )

          // Update the set with flashcards
          const updatedSet = {
            ...localSet,
            flashcards: localSet.flashcards,
          }
          this.flashcardService.updateFlashcardSet(updatedSet)
        }
      } else {
        // Set exists, ensure flashcards are synced
        const localFlashcards = localSet.flashcards || []
        const serviceFlashcards = flashcardServiceSet.flashcards || []

        if (
          JSON.stringify(localFlashcards) !== JSON.stringify(serviceFlashcards)
        ) {
          console.log(`Updating flashcards for set ${localSet.id}`)

          // Update the set with flashcards
          const updatedSet = {
            ...flashcardServiceSet,
            flashcards: localFlashcards,
          }
          this.flashcardService.updateFlashcardSet(updatedSet)
        }
      }
    }

    // For each set in FlashcardService, ensure it exists in localStorage
    for (const flashcardSet of flashcardSets) {
      const localStorageSet = localStorageSets.find(
        (s) => s.id === flashcardSet.id,
      )

      if (!localStorageSet) {
        console.log(`Adding missing set ${flashcardSet.id} to LocalStorage`)
        this.localStorageService.updateState((state) => ({
          ...state,
          flashcardSets: [
            ...state.flashcardSets,
            {
              ...flashcardSet,
              flashcards: flashcardSet.flashcards.map((card, index) => ({
                ...card,
                position: index,
                flashcard_set_id: flashcardSet.id,
              })),
            },
          ],
        }))
      } else {
        // Check if flashcards need to be updated in localStorage
        const localFlashcards = localStorageSet.flashcards || []
        const serviceFlashcards = flashcardSet.flashcards || []

        if (
          JSON.stringify(localFlashcards) !== JSON.stringify(serviceFlashcards)
        ) {
          console.log(
            `Updating flashcards in localStorage for set ${flashcardSet.id}`,
          )

          this.localStorageService.updateState((state) => ({
            ...state,
            flashcardSets: state.flashcardSets.map((set) =>
              set.id === flashcardSet.id
                ? {
                    ...set,
                    flashcards: serviceFlashcards.map((card, index) => ({
                      ...card,
                      position: index,
                      flashcard_set_id: flashcardSet.id,
                    })),
                  }
                : set,
            ),
          }))
        }
      }
    }

    // Ensure dirty items are preserved
    const dirtyItems = this.localStorageService.getDirtyItems()
    if (dirtyItems.length > 0) {
      console.log(`Preserving ${dirtyItems.length} dirty items`)
    }

    console.log('Service synchronization complete')
  }

  /**
   * Updates the card order in the selected set
   * @param newOrder The new order of cards
   */
  public updateCardOrder(newOrder: any[]): void {
    const currentSetId = this.selectedSetId()
    if (!currentSetId) {
      console.warn('Cannot update card order: No set selected')
      return
    }

    console.log(`Updating card order for set ${currentSetId}`)

    // Update the order in FlashcardService
    const currentSet = this.flashcardService.getFlashcardSet(currentSetId)
    if (currentSet) {
      const updatedSet = {
        ...currentSet,
        flashcards: newOrder.map((card, index) => ({
          ...card,
          position: index,
          flashcard_set_id: currentSetId,
        })),
      }

      this.flashcardService.updateFlashcardSet(updatedSet)
      console.log(`Updated card order in FlashcardService`)
    }
  }
}
