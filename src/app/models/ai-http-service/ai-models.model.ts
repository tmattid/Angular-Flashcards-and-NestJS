export const AVAILABLE_MODELS = [
  'meta-llama/llama-4-scout',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-flash-preview-05-20',
] as const

export type ModelType = typeof AVAILABLE_MODELS[number]

export const OPENROUTER_MODELS = {
  'google/gemini-2.5-flash-preview-05-20': {
    name: 'Gemini 2.5 Pro ',
    description: "Google's latest model - Preview",
    context_length: 200000,
    tokens_per_second: 1000,  
  },
  'google/gemini-2.0-flash-001': {
    name: 'Gemini 2.0 Flash 001',
    description: "Google's latest model - Preview",
    context_length: 128000,
    tokens_per_second: 1000,
  },
  'meta-llama/llama-4-scout': {
    name: 'Llama 4 Scout',
    description: "Meta's latest model",
    context_length: 100000,
    tokens_per_second: 1000,
  },
} as const

export type ModelId = keyof typeof OPENROUTER_MODELS

export interface OpenRouterModel {
  name: string
  description: string
  context_length: number
  tokens_per_second: number
}

export interface Model extends OpenRouterModel {
  id: ModelId
}

export const MODEL_DETAILS: Model[] = Object.entries(OPENROUTER_MODELS).map(
  ([id, details]) => ({
    id: id as ModelId,
    ...details,
  }),
)

// OpenRouter API Types
export interface OpenRouterRequest {
  model: ModelId
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  response_format?: {
    type: 'json_object'
    schema?: {
      type: 'object'
      properties: {
        cards: {
          type: 'array'
          items: {
            type: 'object'
            properties: {
              front: {
                type: 'string'
                description: 'The question or prompt side of the flashcard'
              }
              back: {
                type: 'string'
                description: 'The answer or explanation side of the flashcard'
              }
            }
            required: ['front', 'back']
          }
          minItems: 3
          maxItems: 5
          description: 'Generate between 3 and 5 flashcards'
        }
      }
      required: ['cards']
    }
  }
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

export interface OpenRouterResponse {
  id: string
  choices: Array<{
    message: OpenRouterMessage
    finish_reason: 'stop' | 'length' | 'content_filter'
  }>
  model: ModelId
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
