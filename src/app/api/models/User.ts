/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type User = {
    /**
     * Unique identifier for the user
     */
    id: string;
    /**
     * User's email address
     */
    email: string;
    /**
     * User's first name
     */
    firstName?: string;
    /**
     * User's last name
     */
    lastName?: string;
    /**
     * URL to user's profile picture
     */
    profilePicture?: string;
    /**
     * Authentication provider (e.g., google)
     */
    provider: User.provider;
    /**
     * User's role in the system
     */
    role?: string;
    /**
     * User's app metadata
     */
    app_metadata?: Record<string, any>;
    /**
     * User's user metadata
     */
    user_metadata?: Record<string, any>;
    /**
     * When the user was created
     */
    createdAt: string;
    /**
     * When the user was last updated
     */
    updatedAt: string;
};
export namespace User {
    /**
     * Authentication provider (e.g., google)
     */
    export enum provider {
        GOOGLE = 'google',
    }
}

