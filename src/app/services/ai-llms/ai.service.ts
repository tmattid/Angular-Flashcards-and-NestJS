import { Injectable, inject, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Model, MODEL_DETAILS, ModelType } from '../../models/ai-http-service/ai-models.model';
import { environment } from '../../../environments/environment';
import { ChatMessage, ChatRequest, EdgeFunctionResponse } from '../../models/ai-http-service/ai.types';



@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly SUPABASE_URL = 'https://bpqyrdbmzfvtjhhworvk.supabase.co';

  private readonly availableModels = signal<Model[]>(MODEL_DETAILS);
  private readonly currentModel = signal<Model>(MODEL_DETAILS[0]);
  private readonly chatHistory = signal<ChatMessage[]>([]);

  readonly models = this.availableModels.asReadonly();
  readonly selectedModel = this.currentModel.asReadonly();
  readonly messages = this.chatHistory.asReadonly();

  setModel(modelId: ModelType): void {
    const model = this.availableModels().find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    this.currentModel.set(model);
  }

  private async processStreamResponse(response: Response): Promise<EdgeFunctionResponse> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
    }

    // Process final buffer
    const finalBuffer = decoder.decode();
    buffer += finalBuffer;

    try {
      return JSON.parse(buffer) as EdgeFunctionResponse;
    } catch (error) {
      throw new Error(`Failed to parse response: ${error}`);
    }
  }

  generateResponse(prompt: string): Observable<EdgeFunctionResponse> {
    const requestBody: ChatRequest = {
      prompt,
      model_id: this.currentModel().id,
      system_prompt: `You are a helpful AI assistant focused on education. First, respond conversationally
        to the user's message. Then, if appropriate, create educational flashcards based on the topic.
        Each flashcard should have a front (question/prompt) and back (answer/explanation).`,
      chat_history: this.chatHistory(),
    };

    const headers = new Headers({
      Authorization: `Bearer ${environment.supabaseKey}`,
      'Content-Type': 'application/json',
    });

    // Add user message to history
    this.chatHistory.update(history => [...history, { role: 'user', content: prompt }]);

    // Convert the fetch promise to an observable
    return from(
      fetch(`${this.SUPABASE_URL}/functions/v1/generate-flashcards`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return this.processStreamResponse(response);
      })
    );
  }

  clearChat(): void {
    this.chatHistory.set([]);
  }
}
