import { OAuthProviderType } from '../../enums/auth-type.enum';
export declare class OAuthProviderResponseDto {
    provider: OAuthProviderType;
    providerUserId: string;
    expiresAt?: Date;
    displayName?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
    rawProfile?: Record<string, any>;
}
