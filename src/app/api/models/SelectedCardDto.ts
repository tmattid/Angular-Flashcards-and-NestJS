/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SelectedCardDto = {
    /**
     * ID of the flashcard
     */
    flashcardId: string;
    /**
     * Front side of the flashcard
     */
    front: string;
    /**
     * Back side of the flashcard
     */
    back: string;
    /**
     * Position of the card in the set
     */
    position: number;
    /**
     * Difficulty level of the card
     */
    difficulty?: number | null;
};

