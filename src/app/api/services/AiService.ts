/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { FlashcardResponse } from '../models/FlashcardResponse';
import type { FlashcardUpdateResponse } from '../models/FlashcardUpdateResponse';
import type { GenerateFlashcardsRequestDto } from '../models/GenerateFlashcardsRequestDto';
import type { UpdateFlashcardsRequestDto } from '../models/UpdateFlashcardsRequestDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class AiService {
    constructor(public readonly http: HttpClient) {}
    /**
     * Update flashcards with AI assistance
     * @param requestBody
     * @returns FlashcardUpdateResponse Flashcards updated successfully
     * @throws ApiError
     */
    public updateFlashcards(
        requestBody: UpdateFlashcardsRequestDto,
    ): Observable<FlashcardUpdateResponse> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/ai/update-flashcards',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Generate new flashcards using AI
     * @param requestBody
     * @returns FlashcardResponse Flashcards generated successfully
     * @throws ApiError
     */
    public generateFlashcards(
        requestBody: GenerateFlashcardsRequestDto,
    ): Observable<FlashcardResponse> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/ai/generate-flashcards',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
