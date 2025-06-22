// AI Chat utility functions and configurations
export const AI_CHAT_CONFIG = {
  maxMessages: 100,
  maxTokens: 4000,
  temperature: 0.7,
} as const

export type AIChatConfig = typeof AI_CHAT_CONFIG