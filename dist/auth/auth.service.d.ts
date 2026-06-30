import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/requests/signup.dto';
import { LoginDto } from './dto/requests/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { AuthStrategy } from './enums/auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod, MfaType } from './entities/mfa-method.entity';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/requests/magic-link.dto';
import { SecureAccountDto } from './dto/requests/secure-account.dto';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { SessionLog } from './entities/session_log.entity';
export declare class AuthService {
    private jwtService;
    private passwordStrategy;
    private oauthStrategy;
    private sessionRepository;
    private sessionLogRepo;
    private authRepo;
    private otpRepo;
    private mfaRepo;
    private options;
    private notificationProvider?;
    private readonly eventEmitter?;
    private readonly logger;
    private readonly createSessionLog;
    constructor(jwtService: JwtService, passwordStrategy: LocalAuthStrategy, oauthStrategy: OAuthAuthStrategy, sessionRepository: Repository<Session>, sessionLogRepo: Repository<SessionLog>, authRepo: Repository<Auth>, otpRepo: Repository<OtpToken>, mfaRepo: Repository<MfaMethod>, options: AuthModuleOptions, notificationProvider?: AuthNotificationProvider, eventEmitter?: EventEmitter2);
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
            identifiers: AuthIdentifier[];
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            oauthProviders?: import("..").OAuthProvider[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date;
        };
        verificationRequired: boolean;
    } | {
        auth: {
            uid: string;
            strategy: AuthStrategy;
            identifiers: AuthIdentifier[];
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            oauthProviders?: import("..").OAuthProvider[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date;
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
            identifiers: AuthIdentifier[];
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            oauthProviders?: import("..").OAuthProvider[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date;
        };
        mfaRequired: boolean;
        tokens: any;
        verificationRequired?: undefined;
    } | {
        auth: {
            uid: string;
            strategy: AuthStrategy;
            identifiers: AuthIdentifier[];
            isPrimary: boolean;
            isVerified: boolean;
            isActive: boolean;
            meta?: Record<string, any>;
            lastUsedAt?: Date;
            oauthProviders?: import("..").OAuthProvider[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date;
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
        tokens?: undefined;
        auth?: undefined;
    } | {
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
        namespace: string;
    }): Promise<SessionLog[]>;
}
