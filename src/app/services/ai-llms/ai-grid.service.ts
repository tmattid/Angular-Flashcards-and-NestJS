import { Injectable, inject } from '@angular/core'
import { Observable, from } from 'rxjs'
import { environment } from '../../../environments/environment'
import { Model, ModelId } from '../../models/ai-http-service/ai-models.model'
import { GridRow } from '../../ag-grid/ag-grid.component'
import { LocalStorageService } from '../state/local-storage.service'

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
    difficulty: number | null | string
  }>
  totalCards: number
  scope: 'selected' | 'fullset'
}

@Injectable({
  providedIn: 'root',
})
export class AiGridService {
  private readonly SUPABASE_URL = 'https://bpqyrdbmzfvtjhhworvk.supabase.co'
  private readonly localStorageService = inject(LocalStorageService)

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

    const headers = new Headers({
      Authorization: `Bearer ${environment.supabaseKey}`,
      'Content-Type': 'application/json',
    })

    return from(
      fetch(`${this.SUPABASE_URL}/functions/v1/update-flashcards`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()

        // Update local storage using existing updateState method
        if (data.updates?.length > 0) {
          this.localStorageService.updateState((current) => ({
            flashcardSets: current.flashcardSets.map((set) => ({
              ...set,
              flashcards: set.flashcards.map((card) => {
                const update = data.updates?.find(
                  (u: { flashcardId: string }) => u.flashcardId === card.id,
                )
                if (update) {
                  this.localStorageService.markDirty(card.id)
                  return {
                    ...card,
                    ...update.changes,
                  }
                }
                return card
              }),
            })),
          }))
        }

        return data
      }),
    )
  }
}
