import { Injectable, inject, signal, computed } from '@angular/core'
import {
  Flashcard,
  FlashcardSetWithCards,
  CreateFlashcardSetDto,
  CreateFlashcardDto,
  UpdateFlashcardDto,
  UpdateFlashcardSetDto,
} from '../../api'
import { Observable, tap, firstValueFrom } from 'rxjs'
import { AuthService } from '../../services/auth.service'
import { FlashcardService } from '../../services/flashcard-http.service'
import { LocalStorageService } from '../../services/state/local-storage.service'

@Injectable({
  providedIn: 'root',
})
export class FlashcardCDKService {
  private readonly authService = inject(AuthService)
  private readonly flashcardService = inject(FlashcardService)
  private readonly localStorageService = inject(LocalStorageService)

  selectedSetCards = computed(() => {
    const setId = this.selectedSetId()
    if (!setId) return []

    const set = this.flashcardSets().find((s) => s.id === setId)
    return set?.flashcards ?? []
  })

  newFlashcards = signal<Flashcard[]>([])
  selectedSetId = signal<string | null>(null)
  flashcardSets = signal<FlashcardSetWithCards[]>([])

  async loadFlashcardSets(): Promise<void> {
    try {
      const sets = await firstValueFrom(
        this.flashcardService.getFlashcardSets(),
      )
      this.flashcardSets.set(sets)

      // Update local storage with the fetched sets
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: sets,
      }))

      // Set the first set as selected if we have sets
      if (sets.length > 0) {
        this.selectedSetId.set(sets[0].id)
      }
    } catch (error) {
      console.error('Error loading flashcard sets:', error)
    }
  }

  // Only call this when explicitly needed to refresh a specific set
  async loadSet(setId: string | null): Promise<void> {
    if (!setId) return

    try {
      const set = await firstValueFrom(
        this.flashcardService.getFlashcardSet(setId),
      )
      if (set) {
        this.flashcardSets.update((sets) =>
          sets.map((s) => (s.id === setId ? set : s)),
        )
        // Update local storage with the updated set
        this.localStorageService.updateState((state) => ({
          ...state,
          flashcardSets: state.flashcardSets.map((s) =>
            s.id === setId ? set : s,
          ),
        }))
        this.selectedSetId.set(setId)
      }
    } catch (error) {
      console.error('Error loading specific set:', error)
    }
  }

  createNewSet(
    title: string,
    icon_id: string,
  ): Observable<FlashcardSetWithCards> {
    const newSet: CreateFlashcardSetDto = {
      iconId: (icon_id as unknown) as Record<string, any>,
      title: title,
      description: (null as unknown) as Record<string, any>,
    }

    return this.flashcardService.createFlashcardSet(newSet).pipe(
      tap((set: FlashcardSetWithCards) => {
        if (set) {
          this.flashcardSets.update((sets) => [...sets, set])
          this.selectedSetId.set(set.id)
          this.loadSet(set.id)
        }
      }),
    )
  }

  saveSelectedSet(): void {
    const currentSetId = this.selectedSetId()
    if (!currentSetId) return

    const currentSet = this.flashcardSets().find(
      (set) => set.id === currentSetId,
    )
    if (!currentSet) return

    const updatedCards = this.selectedSetCards().map((card, index) => ({
      ...card,
      position: index,
    }))

    // Update each card in the set
    updatedCards.forEach((card) => {
      const updateDto: UpdateFlashcardDto = {
        position: card.position,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        tags: card.tags,
      }
      this.flashcardService
        .updateCard(card.id, updateDto, currentSetId)
        .pipe(
          tap((updatedSet: FlashcardSetWithCards) => {
            if (updatedSet) {
              this.flashcardSets.update((sets) =>
                sets.map((s) => (s.id === currentSetId ? updatedSet : s)),
              )
            }
          }),
        )
        .subscribe()
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
      const currentSetId = this.selectedSetId()
      if (!currentSetId) return

      updatedCards.forEach((card) => {
        const updateDto: UpdateFlashcardDto = {
          position: card.position,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty,
          tags: card.tags,
        }
        this.flashcardService
          .updateCard(card.id, updateDto, currentSetId)
          .pipe(
            tap((updatedSet: FlashcardSetWithCards) => {
              if (updatedSet) {
                this.flashcardSets.update((sets) =>
                  sets.map((s) => (s.id === currentSetId ? updatedSet : s)),
                )
              }
            }),
          )
          .subscribe()
      })
    }
  }

  setNewFlashcards(cards: Array<{ front: string; back: string }>): void {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      console.warn(
        'FlashcardCDKService: Empty or invalid flashcards array received',
        cards,
      )
      return
    }

    const currentSetId = this.selectedSetId()
    if (!currentSetId) return

    const flashcards: Flashcard[] = cards.map((card, index) => {
      if (typeof card !== 'object' || !card.front || !card.back) {
        console.warn('Invalid flashcard format:', card)
        return {
          id: `temp_${index}`,
          front: card?.front || 'Missing front content',
          back: card?.back || 'Missing back content',
          position: index,
          difficulty: undefined,
          tags: undefined,
          setId: currentSetId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      return {
        id: `temp_${index}`,
        front: card.front,
        back: card.back,
        position: index,
        difficulty: undefined,
        tags: undefined,
        setId: currentSetId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    // Update the newFlashcards signal directly
    this.newFlashcards.set(flashcards)

    // Create each flashcard
    flashcards.forEach((card) => {
      const createDto: CreateFlashcardDto = {
        front: card.front,
        back: card.back,
        position: card.position,
        setId: currentSetId,
      }
      this.flashcardService
        .createCard(createDto, currentSetId)
        .pipe(
          tap((updatedSet: FlashcardSetWithCards) => {
            if (updatedSet) {
              this.flashcardSets.update((sets) =>
                sets.map((s) => (s.id === currentSetId ? updatedSet : s)),
              )
            }
          }),
        )
        .subscribe()
    })
  }

  verifySetExists(setId: string): boolean {
    return this.flashcardSets().some((set) => set.id === setId)
  }
}
