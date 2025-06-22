/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GridPromptContextDto } from './GridPromptContextDto';
export type UpdateFlashcardsRequestDto = {
    /**
     * The prompt for updating flashcards
     */
    prompt: string;
    /**
     * The model ID to use for generation
     */
    model_id: string;
    /**
     * Context for the flashcard grid update
     */
    context: GridPromptContextDto;
};

