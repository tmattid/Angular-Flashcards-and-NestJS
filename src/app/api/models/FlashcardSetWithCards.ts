/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Flashcard } from './Flashcard';
export type FlashcardSetWithCards = {
    /**
     * Unique identifier for the flashcard set
     */
    id: string;
    /**
     * Title of the flashcard set
     */
    title: string;
    /**
     * Description of the flashcard set
     */
    description?: string;
    /**
     * Icon ID for the set
     */
    iconId?: string;
    /**
     * Position of the set in the list
     */
    setPosition?: number;
    /**
     * ID of the user who created the set
     */
    createdBy: string;
    /**
     * When the set was created
     */
    createdAt: string;
    /**
     * When the set was last updated
     */
    updatedAt: string;
    /**
     * Array of flashcards in the set
     */
    flashcards: Array<Flashcard>;
};

