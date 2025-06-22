/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessageDto } from './ChatMessageDto';
export type GenerateFlashcardsRequestDto = {
    /**
     * The prompt for generating flashcards
     */
    prompt: string;
    /**
     * The model ID to use for generation
     */
    model_id: string;
    /**
     * Optional system prompt
     */
    system_prompt?: string;
    /**
     * Optional chat history
     */
    chat_history?: Array<ChatMessageDto>;
};

