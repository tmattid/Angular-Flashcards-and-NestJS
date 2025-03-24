import { Injectable, computed, inject, signal } from '@angular/core'
import { Observable, catchError, from, of, tap } from 'rxjs'
import { environment } from '../../../environments/environment'
import { HttpClient } from '@angular/common/http'
import {
  MODEL_DETAILS,
  Model,
  ModelType,
} from '../../models/ai-http-service/ai-models.model'
import {
  ChatRequest,
  EdgeFunctionResponse,
} from '../../models/ai-http-service/ai.types'
import { Flashcard } from '../../api'
import { FlashcardCDKService } from '../../ai-chat/services/flashcard-cdk-service.service'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface GeneratedFlashcard {
  front: string
  back: string
}

interface ExtendedEdgeFunctionResponse extends EdgeFunctionResponse {
  flashcards?: GeneratedFlashcard[]
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly http = inject(HttpClient)
  private readonly flashcardCDKService = inject(FlashcardCDKService)
  private readonly apiUrl = `${environment.apiUrl}/ai`

  private readonly availableModels = signal<Model[]>(MODEL_DETAILS)
  private readonly currentModel = signal<Model>(MODEL_DETAILS[0])
  private readonly chatHistory = signal<ChatMessage[]>([])

  readonly models = this.availableModels.asReadonly()
  readonly selectedModel = this.currentModel.asReadonly()
  readonly messages = this.chatHistory.asReadonly()

  setModel(modelId: ModelType): void {
    const model = this.availableModels().find((m) => m.id === modelId)
    if (model) {
      this.currentModel.set(model)
    }
  }

  private async processStreamResponse(
    response: Response,
  ): Promise<ExtendedEdgeFunctionResponse> {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is null')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
    }

    // Process final buffer
    const finalBuffer = decoder.decode()
    buffer += finalBuffer

    try {
      return JSON.parse(buffer) as ExtendedEdgeFunctionResponse
    } catch (error) {
      throw new Error(`Failed to parse response: ${error}`)
    }
  }

  generateResponse(prompt: string): Observable<ExtendedEdgeFunctionResponse> {
    const requestBody = {
      prompt,
      model_id: this.currentModel().id,
      system_prompt: `You are a helpful AI assistant focused on education. First, respond conversationally
        to the user's message. Then, if appropriate, create educational flashcards based on the topic.
        Each flashcard should have a front (question/prompt) and back (answer/explanation).`,
      chat_history: this.chatHistory(),
    }

    // Add user message to history
    this.chatHistory.update((history) => [
      ...history,
      { role: 'user', content: prompt },
    ])

    console.log('AiService: Sending request to backend', requestBody)

    return this.http
      .post<ExtendedEdgeFunctionResponse>(
        `${this.apiUrl}/generate-flashcards`,
        requestBody,
      )
      .pipe(
        tap((response) => {
          console.log('AiService: Received response from backend', response)

          // Add assistant message to history
          if (response.message) {
            this.chatHistory.update((history) => [
              ...history,
              { role: 'assistant', content: response.message || '' },
            ])
          }

          // Process flashcards if they exist in the response
          if (response.flashcards && response.flashcards.length > 0) {
            // Get current new flashcards
            const currentNewCards = this.flashcardCDKService.newFlashcards()

            // Create new flashcards with proper structure
            const newFlashcards: Flashcard[] = response.flashcards.map(
              (card: GeneratedFlashcard, index: number) => ({
                id: `temp-${Date.now()}-${index}`, // Temporary ID for new cards
                front: card.front,
                back: card.back,
                position: currentNewCards.length + index,
                setId: '', // Empty string for new cards
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
            )

            // Update the new flashcards in the CDK service
            this.flashcardCDKService.newFlashcards.set([
              ...currentNewCards,
              ...newFlashcards,
            ])
          }
        }),
        catchError((error) => {
          console.error('AI Service error:', error)
          return of({
            message: 'Failed to generate response. Please try again later.',
          } as ExtendedEdgeFunctionResponse)
        }),
      )
  }

  clearChat(): void {
    this.chatHistory.set([])
  }
}
