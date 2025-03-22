/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { FlashcardResponse } from '../models/FlashcardResponse';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class AiService {
    constructor(public readonly http: HttpClient) {}
    /**
     * Update flashcards with AI assistance
     * @returns FlashcardResponse Flashcards updated successfully
     * @throws ApiError
     */
    public updateFlashcards(): Observable<FlashcardResponse> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/ai/update-flashcards',
        });
    }
    /**
     * Generate new flashcards using AI
     * @returns FlashcardResponse Flashcards generated successfully
     * @throws ApiError
     */
    public generateFlashcards(): Observable<FlashcardResponse> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/ai/generate-flashcards',
        });
    }
}
