/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Flashcard } from './Flashcard';
export type FlashcardResponse = {
    /**
     * Message explaining the AI's response or changes
     */
    message: string;
    /**
     * Array of flashcards
     */
    cards: Array<Flashcard>;
};

