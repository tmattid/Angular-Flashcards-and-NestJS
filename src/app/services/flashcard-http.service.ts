import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { FlashcardsService } from '../api/services/FlashcardsService'
import {
  FlashcardSetWithCards,
  CreateFlashcardSetDto,
  CreateFlashcardDto,
  UpdateFlashcardDto,
  UpdateFlashcardSetDto,
} from '../api'
import { LocalStorageService } from '../services/state/local-storage.service'
import { HttpClient } from '@angular/common/http'

/**
 * @FlashcardService
 *
 * This service manages flashcard sets and their synchronization with the backend.
 * Uses the OpenAPI-generated services with proper configuration.
 */
@Injectable({
  providedIn: 'root',
})
export class FlashcardService {
  private readonly localStorageService = inject(LocalStorageService)
  private readonly apiService = inject(FlashcardsService)
  private readonly http = inject(HttpClient)

  getFlashcardSets(): Observable<FlashcardSetWithCards[]> {
    return this.apiService.getFlashcardSets()
  }

  getFlashcardSet(id: string): Observable<FlashcardSetWithCards> {
    return this.apiService.getFlashcardSet(id)
  }

  createFlashcardSet(
    dto: CreateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.createFlashcardSet(dto)
  }

  updateFlashcardSet(
    id: string,
    dto: UpdateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.updateFlashcardSet(id, dto)
  }

  deleteFlashcardSet(id: string): Observable<void> {
    return this.apiService.deleteFlashcardSet(id)
  }

  createCard(
    dto: CreateFlashcardDto,
    setId: string,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.createCard(dto)
  }

  updateCard(
    id: string,
    dto: UpdateFlashcardDto,
    setId: string,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.updateCard(id, dto)
  }

  deleteCard(id: string, setId: string): Observable<void> {
    return this.apiService.deleteCard(id)
  }

  updateSet(
    setId: string,
    updateDto: UpdateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return this.apiService.updateFlashcardSet(setId, updateDto)
  }

  syncToBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      const state = this.localStorageService.getState()
      if (!state?.flashcardSets) {
        resolve()
        return
      }

      const flashcardSets = state.flashcardSets as FlashcardSetWithCards[]

      // Format the data according to the API expectations
      const formattedSets = flashcardSets.map((set) => ({
        ...set,
        // Convert null to undefined for optional fields
        description: set.description || undefined,
        iconId: set.iconId || undefined,
        setPosition: set.setPosition || undefined,
        flashcards: set.flashcards.map((card) => ({
          ...card,
          difficulty: card.difficulty || undefined,
          tags: card.tags || undefined,
        })),
      })) as FlashcardSetWithCards[]

      console.log('Sending sync data:', formattedSets)

      // Send the complete flashcard sets directly to the API
      this.apiService.syncFlashcardSets(formattedSets).subscribe({
        next: (response) => {
          console.log('Sync successful:', response)
          resolve()
        },
        error: (error) => {
          console.error('Sync failed:', error)
          reject(error)
        },
      })
    })
  }

  getDirtyItems(): readonly string[] {
    return this.localStorageService.getDirtyItems()
  }
}
