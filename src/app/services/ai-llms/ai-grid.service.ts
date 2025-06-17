import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of, tap } from 'rxjs'
import { environment } from '../../../environments/environment'
import { ModelId } from '../../models/ai-http-service/ai-models.model'
import { GridRow } from '../../dashboard/features/grid'
import { LocalStorageService } from '../state/local-storage.service'
import { HttpClient } from '@angular/common/http'
import { FlashcardService } from '../flashcard-http.service'
import { Flashcard, FlashcardSetWithCards } from '../../api'

interface GridAiResponse {
  message: string
  updates?: Array<{
    flashcardId: string
    changes: Partial<Pick<GridRow, 'front' | 'back' | 'difficulty'>>
  }>
}

interface GridPromptContext {
  setId: string
  setTitle: string
  selectedCards: Array<{
    flashcardId: string
    front: string
    back: string
    position: number
    difficulty: Record<string, any> | undefined
  }>
  totalCards: number
  scope: 'selected' | 'fullset'
}

@Injectable({
  providedIn: 'root',
})
export class AiGridService {
  private readonly apiUrl = `${environment.apiUrl}/ai`
  private readonly localStorageService = inject(LocalStorageService)
  private readonly http = inject(HttpClient)
  private readonly flashcardService = inject(FlashcardService)

  generateGridUpdates(
    prompt: string,
    context: GridPromptContext,
    modelId: ModelId,
  ): Observable<GridAiResponse> {
    const requestBody = {
      prompt,
      model_id: modelId,
      context: {
        ...context,
        scope: context.selectedCards.length > 0 ? 'selected' : 'fullset',
      },
    }

    return this.http
      .post<GridAiResponse>(`${this.apiUrl}/update-flashcards`, requestBody)
      .pipe(
        tap((response) => {
          // Automatically apply updates to localStorage
          if (response.updates && response.updates.length > 0) {
            this.applyUpdatesToLocalStorage(response.updates)
          }
        }),
        catchError((error) => {
          console.error('AI Grid Service error:', error)
          return of({
            message: 'Failed to process AI request. Please try again.',
          })
        }),
      )
  }

  applyUpdatesToLocalStorage(updates: GridAiResponse['updates']): void {
    if (!updates || updates.length === 0) return

    const updatedSetIds = new Set<string>()

    this.localStorageService.updateState((current) => ({
      ...current,
      flashcardSets: current.flashcardSets.map((set: FlashcardSetWithCards) => {
        let setWasUpdated = false
        const updatedFlashcards = set.flashcards.map((card: Flashcard) => {
          const update = updates.find((u) => u.flashcardId === card.id)
          if (update) {
            setWasUpdated = true
            return {
              ...card,
              ...update.changes,
              difficulty: update.changes.difficulty
                ? { value: update.changes.difficulty }
                : undefined,
            }
          }
          return card
        })

        if (setWasUpdated) {
          updatedSetIds.add(set.id)
        }

        return {
          ...set,
          flashcards: updatedFlashcards,
        }
      }),
    }))

    // Mark the individual cards as dirty for efficient syncing
    updates.forEach((update) => {
      const setId = this.findSetIdForCard(update.flashcardId)
      if (setId) {
        this.localStorageService.markCardDirty(setId, update.flashcardId)
      }
    })
  }

  private findSetIdForCard(cardId: string): string | null {
    const state = this.localStorageService.getState()
    for (const set of state.flashcardSets) {
      if (set.flashcards.some((card) => card.id === cardId)) {
        return set.id
      }
    }
    return null
  }
}
