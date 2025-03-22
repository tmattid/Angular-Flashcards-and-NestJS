import { Injectable, inject, signal, computed } from '@angular/core'
import { LocalStorageService } from '../../services/state/local-storage.service'
import {
  Flashcard,
  FlashcardSetWithCards,
} from '../../models/flashcards.models'
import { Observable, of } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class FlashcardCDKService {
  private readonly localStorageService = inject(LocalStorageService)

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

  constructor() {
    // Initialize with first set if available
    const state = this.localStorageService.getState()
    if (state.flashcardSets.length > 0) {
      this.selectedSetId.set(state.flashcardSets[0].id)
      this.loadSet(state.flashcardSets[0].id)
    }
  }

  loadSet(setId: string | null): void {
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

  saveSelectedSet(): void {
    const currentSetId = this.selectedSetId()
    if (!currentSetId) return

    this.localStorageService.updateState((state) => {
      return {
        ...state,
        flashcardSets: state.flashcardSets.map((set) => {
          if (set.id === currentSetId) {
            return {
              ...set,
              flashcards: this.selectedSetCards().map((card, index) => ({
                ...card,
                position: index,
                flashcard_set_id: currentSetId,
              })),
            }
          }
          return set
        }),
      }
    })
  }

  updateCardPositions(cards: Flashcard[], type: 'new' | 'selected'): void {
    const updatedCards = cards.map((card, index) => ({
      ...card,
      position: index,
    }))
    if (type === 'new') {
      this.newFlashcards.set(updatedCards)
    } else {
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((set) => ({
          ...set,
          flashcards: updatedCards,
        })),
      }))
    }
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

    const currentSetId = this.selectedSetId() || 'new_set'
    console.log('FlashcardCDKService: Using set ID', currentSetId)

    try {
      const flashcards = cards.map((card, index) => {
        if (typeof card !== 'object' || !card.front || !card.back) {
          console.warn('Invalid flashcard format:', card)
          return {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            flashcard_set_id: currentSetId,
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
          flashcard_set_id: currentSetId,
          front: card.front,
          back: card.back,
          position: index,
          difficulty: null,
          tags: null,
        }
        return newCard
      })

      console.log('FlashcardCDKService: Created flashcards', flashcards)
      this.newFlashcards.set(flashcards)
    } catch (error) {
      console.error('Error creating flashcards:', error)
    }
  }

  cleanupDuplicateSets(): void {
    const state = this.localStorageService.getState()
    const uniqueSets = state.flashcardSets.filter(
      (set, index, self) => index === self.findIndex((s) => s.id === set.id),
    )

    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: uniqueSets,
    }))
  }

  verifySetExists(setId: string): boolean {
    const state = this.localStorageService.getState()
    return state.flashcardSets.some((set) => set.id === setId)
  }
}
