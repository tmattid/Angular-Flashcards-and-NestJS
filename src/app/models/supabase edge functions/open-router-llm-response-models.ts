import { OPENROUTER_MODELS } from '../ai-http-service/ai-models.model';

export type ModelId = keyof typeof OPENROUTER_MODELS;

// Base interfaces
export interface Flashcard {
  front: string;
  back: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Request types
export interface RequestBody {
  prompt: string;
  model_id: string;
  system_prompt?: string;
  chat_history?: ChatMessage[];
}

export interface OpenRouterRequest {
  model: ModelId;
  messages: ChatMessage[];
  stream: boolean;
  response_format: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
      };
    };
  };
}

// Response types
export interface AiChatResponse {
  message: string;
  cards: Flashcard[];
}


