import { Injectable,  inject, signal } from '@angular/core'
import { Observable, catchError,  of, tap } from 'rxjs'
import { environment } from '../../../environments/environment'
import { HttpClient } from '@angular/common/http'
import {
  MODEL_DETAILS,
  Model,
  ModelType,
} from '../../models/ai-http-service/ai-models.model'
import {

  EdgeFunctionResponse,
} from '../../models/ai-http-service/ai.types'
import { Flashcard } from '../../api'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}


interface ExtendedEdgeFunctionResponse extends EdgeFunctionResponse {
  cards?: Flashcard[]
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly http = inject(HttpClient)
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

          // Process cards if they exist in the response
          if (response.cards && response.cards.length > 0) {
            // TODO: Handle new flashcards with the simplified architecture
            console.log('Generated cards:', response.cards)
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
