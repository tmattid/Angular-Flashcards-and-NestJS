/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { User } from '../models/User';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class UsersService {
    constructor(public readonly http: HttpClient) {}
    /**
     * Get current user profile
     * @returns User User profile retrieved successfully
     * @throws ApiError
     */
    public getCurrentUser(): Observable<User> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/users/me',
        });
    }
}
