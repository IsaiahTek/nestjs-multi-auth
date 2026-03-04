import { BaseEntity } from './base.entity';
import { Auth } from './auth.entity';
import { OAuthProviderType } from '../auth-type.enum';
export declare class OAuthProvider extends BaseEntity {
    auth: Auth;
    provider: OAuthProviderType;
    providerUserId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
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
