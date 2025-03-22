/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class AuthenticationService {
    constructor(public readonly http: HttpClient) {}
    /**
     * Initiate Google OAuth flow
     * @param state Return URL after authentication
     * @returns any
     * @throws ApiError
     */
    public googleAuth(
        state?: string,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth/google',
            query: {
                'state': state,
            },
        });
    }
    /**
     * Google OAuth callback endpoint
     * @returns void
     * @throws ApiError
     */
    public googleAuthCallback(): Observable<void> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth/google/callback',
            errors: {
                302: `Redirects to frontend with access token`,
            },
        });
    }
    /**
     * Get user profile
     * @returns any User profile retrieved successfully
     * @throws ApiError
     */
    public getProfile(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth/profile',
        });
    }
    /**
     * Test public endpoint
     * @returns any Public endpoint test response
     * @throws ApiError
     */
    public testPublicEndpoint(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth/test',
        });
    }
    /**
     * Test protected endpoint
     * @returns any Protected endpoint test response
     * @throws ApiError
     */
    public testProtectedRoute(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth/test-protected',
        });
    }
    /**
     * Generate debug token (development only)
     * @param userId
     * @returns any Debug token generated successfully
     * @throws ApiError
     */
    public debugToken(
        userId: string,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth/debug/token/{userId}',
            path: {
                'userId': userId,
            },
            errors: {
                403: `Not available in production`,
            },
        });
    }
}
