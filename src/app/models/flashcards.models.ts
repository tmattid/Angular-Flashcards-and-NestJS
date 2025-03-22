import { Tables } from './supabase.models'
import { BaseFlashcard } from './ai-http-service/ai.types'
import { LocalStorageState } from '../services/state/local-storage.service'
import { Flashcards, Flashcard_sets } from './simplified.types'
/**
 * Base Flashcard Set type from database
 */
export interface FlashcardSet extends Flashcard_sets {}

/**
 * Database Flashcard type extending the base AI response type
 */
export interface Flashcard extends Flashcards {}

/**
 * DTO for creating a new flashcard set
 */
export type CreateFlashcardSetDto = Pick<
  FlashcardSet,
  'title' | 'created_by'
> & {
  description?: string | null
}

/**
 * DTO for updating a flashcard set
 */
export type UpdateFlashcardSetDto = Partial<
  Pick<FlashcardSet, 'title' | 'description'>
>

/**
 * DTO for creating a new flashcard
 */
export type CreateFlashcardDto = Pick<
  Flashcard,
  'front' | 'back' | 'flashcard_set_id' | 'position'
> & {
  difficulty?: number | null
  tags?: string[] | null
}

/**
 * DTO for updating a flashcard
 */
export type UpdateFlashcardDto = Partial<
  Pick<Flashcard, 'front' | 'back' | 'difficulty' | 'tags' | 'position'>
>

/**
 * DTO for upserting a single flashcard.
 */
export interface UpsertFlashcardDto {
  id?: string
  front: string
  back: string
  difficulty?: number | null
  tags?: string[] | null
}

/**
 * DTO for upserting a complete flashcard set with its cards
 */
export interface UpsertFlashcardSetDto {
  id?: string
  title: string
  description: string | null
  flashcards: UpsertFlashcardDto[]
}

export interface FlashcardSetWithCards
  extends Omit<FlashcardSet, 'created_by'> {
  flashcards: Array<
    Omit<Flashcard, 'flashcard_set_id'> & {
      position: number
    }
  >
}

// Add strict type for state updates
export type StateUpdater = (current: LocalStorageState) => LocalStorageState

// Add validation types
export interface ValidatedFlashcard extends Flashcard {
  position: number
  flashcard_set_id: string
}

export interface ValidatedFlashcardSet extends FlashcardSetWithCards {
  flashcards: ValidatedFlashcard[]
}
