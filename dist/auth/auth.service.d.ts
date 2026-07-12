import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository, SessionRepository, SessionLogRepository, MfaMethodRepository, AuthIdentifierRepository } from './interfaces/repositories.interface';
import { AuthOtpProvider } from './interfaces/auth-otp-provider.interface';
import { SignupDto } from './dto/requests/signup.dto';
import { LoginDto } from './dto/requests/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { AuthStrategy } from './enums/auth-type.enum';
import { Auth, Session } from './interfaces/models.interface';
import { MfaType } from './enums/mfa-type.enum';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/requests/magic-link.dto';
import { SecureAccountDto } from './dto/requests/secure-account.dto';
import { AuthIdentifier } from './interfaces/models.interface';
import { SessionLog } from './interfaces/models.interface';
export declare class AuthService {
    private jwtService;
    private passwordStrategy;
    private oauthStrategy;
    private sessionRepository;
    private sessionLogRepo;
    private authRepo;
    private authIdentifierRepo;
    private otpProvider;
    private otpProviderEmail;
    private otpProviderPhone;
    private mfaRepo;
    private options;
    private notificationProvider?;
    private readonly eventEmitter?;
    private readonly logger;
    private readonly createSessionLog;
    constructor(jwtService: JwtService, passwordStrategy: LocalAuthStrategy, oauthStrategy: OAuthAuthStrategy, sessionRepository: SessionRepository, sessionLogRepo: SessionLogRepository, authRepo: AuthRepository, authIdentifierRepo: AuthIdentifierRepository, otpProvider: AuthOtpProvider, otpProviderEmail: AuthOtpProvider, otpProviderPhone: AuthOtpProvider, mfaRepo: MfaMethodRepository, options: AuthModuleOptions, notificationProvider?: AuthNotificationProvider, eventEmitter?: EventEmitter2);
    /** Returns the correct OTP provider for the given identifier type. */
    private resolveOtpProvider;
    private generateTokens;
    private fingerprint;
    private createSession;
    private createSessionLogFromSessionIfEnabled;
    private invalidateSession;
    private invalidateSessions;
    signup({ dto, uid, userAgent, ip, namespace }: {
        dto: SignupDto;
        uid?: string;
        userAgent?: string;
        ip?: string;
        namespace?: string;
    }): Promise<{
        message: string;
        auth: {
            uid: string;
            strategy: AuthStrategy;
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            identifiers?: AuthIdentifier[];
            oauthProviders?: import("./interfaces/models.interface").OAuthProvider[];
            toMap(): Record<string, any>;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt?: Date;
        };
        verificationRequired: boolean;
    } | {
        auth: {
            uid: string;
            strategy: AuthStrategy;
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            identifiers?: AuthIdentifier[];
            oauthProviders?: import("./interfaces/models.interface").OAuthProvider[];
            toMap(): Record<string, any>;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt?: Date;
        };
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        verificationRequired?: undefined;
    }>;
    login({ dto, userAgent, ip, namespace }: {
        dto: LoginDto;
        userAgent?: string;
        ip?: string;
        namespace?: string;
    }): Promise<{
        message: string;
        auth: Auth;
        verificationRequired: boolean;
        tokens: any;
        mfaRequired?: undefined;
    } | {
        message: string;
        auth: {
            uid: string;
            strategy: AuthStrategy;
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            identifiers?: AuthIdentifier[];
            oauthProviders?: import("./interfaces/models.interface").OAuthProvider[];
            toMap(): Record<string, any>;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt?: Date;
        };
        mfaRequired: boolean;
        tokens: any;
        verificationRequired?: undefined;
    } | {
        auth: {
            uid: string;
            strategy: AuthStrategy;
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            identifiers?: AuthIdentifier[];
            oauthProviders?: import("./interfaces/models.interface").OAuthProvider[];
            toMap(): Record<string, any>;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt?: Date;
        };
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        verificationRequired?: undefined;
        tokens?: undefined;
        mfaRequired?: undefined;
    }>;
    private sendVerification;
    verifyCode({ uid, code, userAgent, ip, namespace }: {
        uid: string;
        code: string;
        userAgent?: string;
        ip?: string;
        namespace?: string;
    }): Promise<{
        message: string;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
        auth: Auth;
    }>;
    resendVerification(uid: string): Promise<{
        message: string;
    }>;
    refreshTokens({ refreshToken, currentUserAgent, currentIp, namespace }: {
        refreshToken: string;
        currentUserAgent: string;
        currentIp?: string;
        namespace: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken?: string): Promise<void>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updatePassword(uid: string, dto: UpdatePasswordDto, userAgent?: string, ip?: string): Promise<{
        message: string;
    }>;
    secureAccount(dto: SecureAccountDto & {
        uid: string;
    }): Promise<{
        message: string;
    }>;
    requestMagicLink(dto: MagicLinkRequestDto): Promise<{
        message: string;
    }>;
    verifyMagicLink({ dto, userAgent, ip, namespace }: {
        dto: MagicLinkVerifyDto;
        userAgent?: string;
        ip?: string;
        namespace?: string;
    }): Promise<{
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
        auth: Auth;
    }>;
    enrollMfa(uid: string, type: MfaType): Promise<{
        secret: string;
        otpauth: string;
    }>;
    activateMfa(uid: string, type: MfaType, code: string): Promise<{
        message: string;
    }>;
    mfaLogin(uid: string, code: string, userAgent?: string, ip?: string, namespace?: string): Promise<{
        message: string;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
        auth: {
            uid: string;
            strategy: AuthStrategy;
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            identifiers?: AuthIdentifier[];
            oauthProviders?: import("./interfaces/models.interface").OAuthProvider[];
            toMap(): Record<string, any>;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt?: Date;
        };
    }>;
    viewAll(): Promise<import("./dto/responses/auth-response.dto").AuthResponseDto[]>;
    me(uid: string): Promise<import("./dto/responses/auth-response.dto").AuthResponseDto>;
    viewAllMyAuthMethods(uid: string): Promise<import("./dto/responses/auth-response.dto").AuthResponseDto[]>;
    deleteAccount(uid: string): Promise<void>;
    deleteAuthMethod(uid: string, authId: string): Promise<void>;
    getSessions({ uid, namespace }: {
        uid: string;
        namespace?: string;
    }): Promise<Session[]>;
    getSession(id: string): Promise<Session>;
    revokeSession({ sessionId }: {
        sessionId: string;
    }): Promise<void>;
    getSessionLogs({ uid, namespace }: {
        uid: string;
        namespace?: string;
    }): Promise<SessionLog[]>;
}
