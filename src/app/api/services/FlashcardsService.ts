/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import type { Observable } from 'rxjs'
import type { CreateFlashcardDto } from '../models/CreateFlashcardDto'
import type { CreateFlashcardSetDto } from '../models/CreateFlashcardSetDto'
import type { FlashcardSetWithCards } from '../models/FlashcardSetWithCards'
import type { UpdateFlashcardDto } from '../models/UpdateFlashcardDto'
import type { UpdateFlashcardSetDto } from '../models/UpdateFlashcardSetDto'
import { OpenAPI } from '../core/OpenAPI'
import { request as __request } from '../core/request'
@Injectable({
  providedIn: 'root',
})
export class FlashcardsService {
  constructor(public readonly http: HttpClient) {}
  /**
   * Get all flashcard sets for the current user
   * @returns FlashcardSetWithCards Returns all flashcard sets with their cards
   * @throws ApiError
   */
  public getFlashcardSets(): Observable<Array<FlashcardSetWithCards>> {
    return __request(OpenAPI, this.http, {
      method: 'GET',
      url: '/api/flashcards/sets',
    })
  }
  /**
   * Create a new flashcard set
   * @param requestBody
   * @returns FlashcardSetWithCards Flashcard set created successfully
   * @throws ApiError
   */
  public createFlashcardSet(
    requestBody: CreateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return __request(OpenAPI, this.http, {
      method: 'POST',
      url: '/api/flashcards/sets',
      body: requestBody,
      mediaType: 'application/json',
    })
  }
  /**
   * Get a specific flashcard set by ID
   * @param id ID of the flashcard set
   * @returns FlashcardSetWithCards Returns the flashcard set with its cards
   * @throws ApiError
   */
  public getFlashcardSet(id: string): Observable<FlashcardSetWithCards> {
    return __request(OpenAPI, this.http, {
      method: 'GET',
      url: '/api/flashcards/sets/{id}',
      path: {
        id: id,
      },
      errors: {
        404: `Flashcard set not found`,
      },
    })
  }
  /**
   * Update a flashcard set
   * @param id ID of the flashcard set
   * @param requestBody
   * @returns FlashcardSetWithCards Flashcard set updated successfully
   * @throws ApiError
   */
  public updateFlashcardSet(
    id: string,
    requestBody: UpdateFlashcardSetDto,
  ): Observable<FlashcardSetWithCards> {
    return __request(OpenAPI, this.http, {
      method: 'PUT',
      url: '/api/flashcards/sets/{id}',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        404: `Flashcard set not found`,
      },
    })
  }
  /**
   * Delete a flashcard set
   * @param id ID of the flashcard set
   * @returns void
   * @throws ApiError
   */
  public deleteFlashcardSet(id: string): Observable<void> {
    return __request(OpenAPI, this.http, {
      method: 'DELETE',
      url: '/api/flashcards/sets/{id}',
      path: {
        id: id,
      },
      errors: {
        404: `Flashcard set not found`,
      },
    })
  }
  /**
   * Create a new flashcard
   * @param requestBody
   * @returns FlashcardSetWithCards Flashcard created successfully
   * @throws ApiError
   */
  public createCard(
    requestBody: CreateFlashcardDto,
  ): Observable<FlashcardSetWithCards> {
    return __request(OpenAPI, this.http, {
      method: 'POST',
      url: '/api/flashcards/card',
      body: requestBody,
      mediaType: 'application/json',
    })
  }
  /**
   * Update a flashcard
   * @param id ID of the flashcard
   * @param requestBody
   * @returns FlashcardSetWithCards Flashcard updated successfully
   * @throws ApiError
   */
  public updateCard(
    id: string,
    requestBody: UpdateFlashcardDto,
  ): Observable<FlashcardSetWithCards> {
    return __request(OpenAPI, this.http, {
      method: 'PUT',
      url: '/api/flashcards/card/{id}',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
    })
  }
  /**
   * Delete a flashcard
   * @param id ID of the flashcard
   * @returns void
   * @throws ApiError
   */
  public deleteCard(id: string): Observable<void> {
    return __request(OpenAPI, this.http, {
      method: 'DELETE',
      url: '/api/flashcards/card/{id}',
      path: {
        id: id,
      },
    })
  }
  /**
   * Sync flashcard sets with the client
   * @param requestBody Array of flashcard sets to sync
   * @returns FlashcardSetWithCards Flashcard sets synced successfully
   * @throws ApiError
   */
  public syncFlashcardSets(
    requestBody: Array<FlashcardSetWithCards>,
  ): Observable<Array<FlashcardSetWithCards>> {
    return __request(OpenAPI, this.http, {
      method: 'POST',
      url: '/api/flashcards/sync',
      body: requestBody,
      mediaType: 'application/json',
    })
  }
}
