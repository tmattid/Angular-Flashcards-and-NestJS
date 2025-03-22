import { Injectable, inject, signal, computed } from '@angular/core'
import { createClient } from '@supabase/supabase-js'
import { environment } from '../../environments/environment'
import { LocalStorageService } from './state/local-storage.service'
import { FlashcardSetWithCards } from '../models/flashcards.models'

/**
 * @FlashcardService
 *
 * This service manages flashcard sets and their synchronization with Supabase.
 */
@Injectable({ providedIn: 'root' })
export class FlashcardService {
  private localStorageService = inject(LocalStorageService)

  /**
   * Supabase client for interacting with the database.
   */
  private supabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  )
  /**
   * Private signal holding the array of flashcard sets with cards.
   */
  private _flashcardSets = signal<FlashcardSetWithCards[]>([])
  /**
   * Public computed signal exposing the flashcard sets for read-only access.
   */
  readonly flashcardSets = computed(() => this._flashcardSets())

  constructor() {
    // Load flashcard sets from local storage on service initialization.
    const storedSets = this.localStorageService.getState().flashcardSets
    this._flashcardSets.set(storedSets ?? [])
  }

  /**
   * @syncToSupabase
   *
   * Synchronizes flashcard sets from local storage to the Supabase database.
   *
   * @returns A promise that resolves when the synchronization is complete.
   */
  async syncToSupabase(): Promise<void> {
    try {
      // 1. Retrieve flashcard sets from local storage.
      const { flashcardSets } = this.localStorageService.getState()

      // 2. Get the current user's ID from Supabase.
      const {
        data: { user },
      } = await this.supabaseClient.auth.getUser()

      // 3. Throw an error if the user is not authenticated.
      if (!user?.id) {
        throw new Error('User must be authenticated to sync')
      }

      // 4. Prepare flashcard sets for upsert - include icon_Id
      const preparedSets = flashcardSets.map(
        ({ created_at, flashcards, ...set }) => ({
          ...set,
          created_by: user.id,
          updated_at: new Date().toISOString(),
          set_position: set.set_position ?? 0,
          icon_id: set.icon_id ?? '@tui.book',
        }),
      )

      // 5. Prepare flashcards for upsert
      const preparedCards = flashcardSets.flatMap((set) =>
        set.flashcards.map(({ created_at, ...card }) => ({
          ...card,
          flashcard_set_id: set.id,
          updated_at: new Date().toISOString(),
          position: card.position ?? 0,
          difficulty: card.difficulty ?? 0,
          tags: card.tags ?? [],
        })),
      )

      // 6. Perform the upsert operations in parallel.
      const [setsResult, cardsResult] = await Promise.all([
        this.supabaseClient.from('flashcard_sets').upsert(preparedSets, {
          onConflict: 'id',
          ignoreDuplicates: false,
        }),
        this.supabaseClient.from('flashcards').upsert(preparedCards, {
          onConflict: 'id',
          ignoreDuplicates: false,
        }),
      ])

      // 7. Throw an error if either upsert operation fails.
      if (setsResult.error)
        throw new Error(`Sets sync failed: ${setsResult.error.message}`)
      if (cardsResult.error)
        throw new Error(`Cards sync failed: ${cardsResult.error.message}`)
    } catch (error) {
      // 8. Re-throw the error to be handled by the caller.
      throw new Error(
        `Sync failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }
}
