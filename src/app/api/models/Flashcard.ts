/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Flashcard = {
    /**
     * Unique identifier for the flashcard
     */
    id: string;
    /**
     * ID of the flashcard set this card belongs to
     */
    setId: string;
    /**
     * Front side of the flashcard (question/prompt)
     */
    front: string;
    /**
     * Back side of the flashcard (answer/explanation)
     */
    back: string;
    /**
     * Position of the card in the set
     */
    position: number;
    /**
     * Difficulty level of the card (0-5)
     */
    difficulty?: Record<string, any>;
    /**
     * Tags associated with the card
     */
    tags?: Array<string>;
    /**
     * When the card was created
     */
    createdAt: string;
    /**
     * When the card was last updated
     */
    updatedAt: string;
};

