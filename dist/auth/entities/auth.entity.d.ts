import { BaseEntity } from './base.entity';
import { AuthIdentifier } from './auth-identify.entity';
import { OAuthProvider } from './oauth-provider.entity';
import { AuthStrategy } from '../auth-type.enum';
export declare class Auth extends BaseEntity {
    userId: string;
    strategy: AuthStrategy;
    identifiers: AuthIdentifier[];
    secretHash?: string;
    isPrimary: boolean;
    isVerified: boolean;
    isActive: boolean;
    meta?: Record<string, any>;
    lastUsedAt?: Date;
    oauthProvider?: OAuthProvider;
    toMap(): {
        id: string;
        strategy: AuthStrategy;
        isActive: boolean;
        isVerified: boolean;
        isPrimary: boolean;
        meta: Record<string, any>;
        lastUsedAt: Date;
        identifiers: {
            id: string;
            type: import("./auth-identify.entity").IdentifierType;
            value: string;
            isVerified: boolean;
        }[];
        oauthProvider: {
            id: string;
            provider: import("../auth-type.enum").OAuthProviderType;
            providerUserId: string;
            accessToken: string;
            refreshToken: string;
            expiresAt: Date;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date;
        };
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date;
    };
}
