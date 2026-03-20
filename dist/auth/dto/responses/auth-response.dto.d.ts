import { AuthStrategy } from '../../enums/auth-type.enum';
import { AuthIdentifierDto } from './identifier-response.dto';
import { OAuthProviderResponseDto } from './oauth-provider-response.dto';
export declare class AuthResponseDto {
    id: string;
    uid: string;
    strategy: AuthStrategy;
    isPrimary: boolean;
    isVerified: boolean;
    isActive: boolean;
    meta?: Record<string, any>;
    lastUsedAt?: Date;
    identifiers?: AuthIdentifierDto[];
    oauthProviders?: OAuthProviderResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}
