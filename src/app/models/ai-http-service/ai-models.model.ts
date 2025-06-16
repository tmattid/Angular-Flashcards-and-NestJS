export const AVAILABLE_MODELS = [
  'mistralai/ministral-3b',
  'google/gemini-2.5-flash-preview-05-20',
  'openai/gpt-4.1-nano',
  'meta-llama/llama-3.3-8b-instruct:free',
  'deepseek/deepseek-chat-v3-0324',
] as const

export type ModelType = typeof AVAILABLE_MODELS[number]

export const OPENROUTER_MODELS = {
  'google/gemini-2.5-flash-preview-05-20': {
    name: 'Gemini 2.5 Pro ',
    description: "Google's latest model - Preview",
    context_length: 200000,
    tokens_per_second: 1000,
  },
  'mistralai/ministral-3b': {
    name: 'Mistral 3b',
    description: "Mistral's latest model",
    context_length: 128000,
    tokens_per_second: 1000,
  },
  'openai/gpt-4.1-nano': {
    name: 'GPT 4.1 Nano',
    description: "OpenAI's latest model",
    context_length: 100000,
    tokens_per_second: 1000,
  },
  'meta-llama/llama-3.3-8b-instruct:free': {
    name: 'Llama 3.3 8b Instruct',
    description: "Meta's latest model",
    context_length: 100000,
    tokens_per_second: 1000,
  },

  'deepseek/deepseek-chat-v3-0324': {
    name: 'DeepSeek Chat V3 0324',
    description: "DeepSeek's latest model",
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
