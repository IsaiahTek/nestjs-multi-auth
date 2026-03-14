import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { AuthStrategy } from './auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod, MfaType } from './entities/mfa-method.entity';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
export declare class AuthService {
    private jwtService;
    private passwordStrategy;
    private oauthStrategy;
    private sessionRepository;
    private authRepo;
    private otpRepo;
    private mfaRepo;
    private options;
    private notificationProvider?;
    private readonly logger;
    constructor(jwtService: JwtService, passwordStrategy: LocalAuthStrategy, oauthStrategy: OAuthAuthStrategy, sessionRepository: Repository<Session>, authRepo: Repository<Auth>, otpRepo: Repository<OtpToken>, mfaRepo: Repository<MfaMethod>, options: AuthModuleOptions, notificationProvider?: AuthNotificationProvider);
    private generateTokens;
    private fingerprint;
    private createSession;
    signup(dto: SignupDto, uid?: string, userAgent?: string, ip?: string): Promise<{
        message: string;
        auth: {
            id: string;
            strategy: AuthStrategy;
            isActive: boolean;
            isVerified: boolean;
            isPrimary: boolean;
            meta: Record<string, any>;
            lastUsedAt: Date;
            identifiers: {
                id: string;
                type: import("./entities/auth-identify.entity").IdentifierType;
                value: string;
                isVerified: boolean;
            }[];
            oauthProvider: {
                id: string;
                provider: import("./auth-type.enum").OAuthProviderType;
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
        verificationRequired: boolean;
    } | {
        auth: {
            id: string;
            strategy: AuthStrategy;
            isActive: boolean;
            isVerified: boolean;
            isPrimary: boolean;
            meta: Record<string, any>;
            lastUsedAt: Date;
            identifiers: {
                id: string;
                type: import("./entities/auth-identify.entity").IdentifierType;
                value: string;
                isVerified: boolean;
            }[];
            oauthProvider: {
                id: string;
                provider: import("./auth-type.enum").OAuthProviderType;
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
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        verificationRequired?: undefined;
    }>;
    login(dto: LoginDto, userAgent?: string, ip?: string): Promise<{
        message: string;
        auth: {
            id: string;
            strategy: AuthStrategy;
            isActive: boolean;
            isVerified: boolean;
            isPrimary: boolean;
            meta: Record<string, any>;
            lastUsedAt: Date;
            identifiers: {
                id: string;
                type: import("./entities/auth-identify.entity").IdentifierType;
                value: string;
                isVerified: boolean;
            }[];
            oauthProvider: {
                id: string;
                provider: import("./auth-type.enum").OAuthProviderType;
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
        verificationRequired: boolean;
        tokens: any;
        mfaRequired?: undefined;
    } | {
        message: string;
        auth: {
            id: string;
            strategy: AuthStrategy;
            isActive: boolean;
            isVerified: boolean;
            isPrimary: boolean;
            meta: Record<string, any>;
            lastUsedAt: Date;
            identifiers: {
                id: string;
                type: import("./entities/auth-identify.entity").IdentifierType;
                value: string;
                isVerified: boolean;
            }[];
            oauthProvider: {
                id: string;
                provider: import("./auth-type.enum").OAuthProviderType;
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
        mfaRequired: boolean;
        tokens: any;
        verificationRequired?: undefined;
    } | {
        auth: {
            id: string;
            strategy: AuthStrategy;
            isActive: boolean;
            isVerified: boolean;
            isPrimary: boolean;
            meta: Record<string, any>;
            lastUsedAt: Date;
            identifiers: {
                id: string;
                type: import("./entities/auth-identify.entity").IdentifierType;
                value: string;
                isVerified: boolean;
            }[];
            oauthProvider: {
                id: string;
                provider: import("./auth-type.enum").OAuthProviderType;
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
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        verificationRequired?: undefined;
        tokens?: undefined;
        mfaRequired?: undefined;
    }>;
    private sendVerification;
    verifyCode(uid: string, code: string, userAgent?: string, ip?: string): Promise<{
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
    refreshTokens(refreshToken: string, currentUserAgent: string, currentIp?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken?: string): Promise<void>;
    enrollMfa(uid: string, type: MfaType): Promise<{
        secret: string;
        otpauth: string;
    }>;
    activateMfa(uid: string, type: MfaType, code: string): Promise<{
        message: string;
    }>;
    viewAll(): Promise<Auth[]>;
    viewAllMyAuthMethods(uid: string): Promise<Auth[]>;
    deleteAccount(uid: string): Promise<void>;
    deleteAuthMethod(uid: string, authId: string): Promise<void>;
}
