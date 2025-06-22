/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SelectedCardDto } from './SelectedCardDto';
export type GridPromptContextDto = {
    /**
     * ID of the flashcard set
     */
    setId: string;
    /**
     * Title of the flashcard set
     */
    setTitle: string;
    /**
     * Selected cards to update
     */
    selectedCards: Array<SelectedCardDto>;
    /**
     * Total number of cards in the set
     */
    totalCards: number;
    /**
     * Scope of the update
     */
    scope: GridPromptContextDto.scope;
};
export namespace GridPromptContextDto {
    /**
     * Scope of the update
     */
    export enum scope {
        SELECTED = 'selected',
        FULLSET = 'fullset',
    }
}

