import { AuthStrategy } from '../enums/auth-type.enum';
import { IdentifierType, IdentifierSource } from '../enums/identifier-type.enum';
import { OAuthProviderType } from '../enums/auth-type.enum';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { MfaType } from '../enums/mfa-type.enum';
import { SessionEvent } from '../enums/session-event.enum';
export interface BaseDomainModel {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export interface Auth extends BaseDomainModel {
    uid: string;
    strategy: AuthStrategy;
    secretHash?: string;
    isPrimary: boolean;
    isVerified: boolean;
    isActive: boolean;
    meta?: Record<string, any>;
    lastUsedAt?: Date;
    identifiers?: AuthIdentifier[];
    oauthProviders?: OAuthProvider[];
    toMap(): Record<string, any>;
}
export interface AuthIdentifier extends BaseDomainModel {
    auth?: Auth;
    type: IdentifierType;
    value: string;
    isVerified: boolean;
    source: IdentifierSource;
    verifiedBy?: 'OTP' | 'PROVIDER' | 'ADMIN';
    toMap(): Record<string, any>;
}
export interface OAuthProvider extends BaseDomainModel {
    auth?: Auth;
    provider: OAuthProviderType;
    providerUserId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    displayName?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
    rawProfile?: Record<string, any>;
    toMap(): Record<string, any>;
}
export interface OtpToken extends BaseDomainModel {
    identifier: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    isUsed: boolean;
    requestUserId?: string;
    requestAuthId?: string;
    toMap(): Record<string, any>;
}
export interface MfaMethod extends BaseDomainModel {
    uid: string;
    type: MfaType;
    secret: string;
    isEnabled: boolean;
    isDefault: boolean;
    lastUsedAt?: Date;
    toMap(): Record<string, any>;
}
export interface Session {
    id: string;
    uid: string;
    namespace?: string;
    refreshTokenHash: string;
    userAgent?: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    expiresAt: Date;
    createdAt: Date;
    toMap(): Record<string, any>;
}
export interface SessionLog {
    id: string;
    sessionId: string;
    uid: string;
    namespace?: string;
    event: SessionEvent;
    userAgent?: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    timestamp: Date;
    reason?: string;
    toMap(): Record<string, any>;
}
