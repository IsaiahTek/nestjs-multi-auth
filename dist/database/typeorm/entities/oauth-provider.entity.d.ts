import { BaseEntity } from './base.entity';
import { Auth } from './auth.entity';
import { OAuthProviderType } from '../../../auth/enums/auth-type.enum';
export declare class OAuthProvider extends BaseEntity {
    auth: Auth;
    provider: OAuthProviderType;
    providerUserId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    /**
     * Display name from provider (e.g. "John Doe")
     */
    displayName?: string;
    /**
     * Avatar/profile picture URL
     */
    avatarUrl?: string;
    /**
     * Whether provider verified the email
     */
    emailVerified?: boolean;
    /**
     * Raw provider response (for debugging/future-proofing)
     */
    rawProfile?: Record<string, any>;
    toMap(): {
        id: string;
        provider: OAuthProviderType;
        providerUserId: string;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date;
    };
}
