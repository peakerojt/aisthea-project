/**
 * OAuth Type Definitions
 * 
 * TypeScript interfaces for Google OAuth authentication and token management
 */

/**
 * Google Profile returned from OAuth provider
 */
export interface GoogleProfile {
    id: string;
    displayName: string;
    emails?: Array<{ value: string; verified?: boolean }>;
    photos?: Array<{ value: string }>;
    name?: {
        familyName?: string;
        givenName?: string;
    };
}

/**
 * OAuth tokens received from provider
 */
export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number; // Seconds until expiration
}

/**
 * Data structure for UserLogin record
 */
export interface UserLoginData {
    loginProvider: string;
    providerKey: string;
    providerDisplayName?: string;
    userId: number;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
}

/**
 * OAuth user information extracted from profile
 */
export interface OAuthUserInfo {
    email: string;
    fullName: string;
    googleId: string;
    avatarUrl?: string;
}
