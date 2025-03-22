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

  createNewSet(title: string, icon_id: string): Observable<FlashcardSetWithCards> {
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
    this.newFlashcards.set(
      cards.map((card, index) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        flashcard_set_id: this.selectedSetId() || 'new_set',
        front: card.front,
        back: card.back,
        position: index,
        difficulty: null,
        tags: null,
      })),
    )
  }
}
