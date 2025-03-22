/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateFlashcardDto = {
    /**
     * Front side of the flashcard (question/prompt)
     */
    front?: string;
    /**
     * Back side of the flashcard (answer/explanation)
     */
    back?: string;
    /**
     * Difficulty level of the card (0-5)
     */
    difficulty?: Record<string, any>;
    /**
     * Tags associated with the card
     */
    tags?: Array<string>;
    /**
     * Position of the card in the set
     */
    position?: number;
};

