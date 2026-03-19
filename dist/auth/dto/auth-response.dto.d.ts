import { AuthStrategy } from '../enums/auth-type.enum';
export declare class AuthResponseDto {
    id: string;
    uid: string;
    strategy: AuthStrategy;
    isPrimary: boolean;
    isVerified: boolean;
    isActive: boolean;
    meta?: Record<string, any>;
    lastUsedAt?: Date;
    identifiers?: any[];
    oauthProvider?: any;
    createdAt: Date;
    updatedAt: Date;
}
