import { ModelId } from "./ai-models.model";

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

// Base flashcard type that all other flashcard types extend from
export interface BaseFlashcard {
  front: string;
  back: string;
}

// Edge function response type - This is the parent type
export interface EdgeFunctionResponse {
  message: string;
  cards: BaseFlashcard[];
}

// Request types
export interface ChatRequest {
  prompt: string;
  model_id: ModelId;
  system_prompt?: string;
  chat_history?: ChatMessage[];
}
