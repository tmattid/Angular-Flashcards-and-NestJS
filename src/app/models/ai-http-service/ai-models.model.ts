export const AVAILABLE_MODELS = [
  'openai/gpt-4o-2024-11-20',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
] as const;

export type ModelType = (typeof AVAILABLE_MODELS)[number];

export const OPENROUTER_MODELS = {
  'google/gemini-2.0-flash-lite-preview-02-05:free': {
    name: 'Gemini 2.0 Flash lite preview',
    description: 'Google\'s latest model - Preview',
    context_length: 200000,
    tokens_per_second: 1000,
  },
  'google/gemini-2.0-flash-001': {
    name: 'Gemini 2.0 Flash 001',
    description: 'Google\'s latest model - Preview',
    context_length: 128000,
    tokens_per_second: 1000,
  },
  'openai/gpt-4o-2024-11-20': {
    name: 'Open AI GPT-40',
    description: 'Anthropic\'s latest model',
    context_length: 200000,
    tokens_per_second: 1000,
  },
} as const;

export type ModelId = keyof typeof OPENROUTER_MODELS;

export interface OpenRouterModel {
  name: string;
  description: string;
  context_length: number;
  tokens_per_second: number;
}

export interface Model extends OpenRouterModel {
  id: ModelId;
}

export const MODEL_DETAILS: Model[] = Object.entries(OPENROUTER_MODELS).map(
  ([id, details]) => ({
    id: id as ModelId,
    ...details,
  })
);

// OpenRouter API Types
export interface OpenRouterRequest {
  model: ModelId;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: {
    type: 'json_object';
    schema?: {
      type: 'object';
      properties: {
        cards: {
          type: 'array';
          items: {
            type: 'object';
            properties: {
              front: { type: 'string', description: 'The question or prompt side of the flashcard' };
              back: { type: 'string', description: 'The answer or explanation side of the flashcard' };
            };
            required: ['front', 'back'];
          };
          minItems: 3;
          maxItems: 5;
          description: 'Generate between 3 and 5 flashcards';
        };
      };
      required: ['cards'];
    };
  };
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: OpenRouterMessage;
    finish_reason: 'stop' | 'length' | 'content_filter';
  }>;
  model: ModelId;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
