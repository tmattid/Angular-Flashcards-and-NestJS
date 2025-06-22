/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FlashcardUpdateResponse = {
    /**
     * Message explaining the changes made
     */
    message: string;
    /**
     * Array of updates to apply to flashcards
     */
    updates: Array<string>;
    /**
     * Array of flashcard IDs to delete
     */
    deletions?: Array<Record<string, any>>;
};

