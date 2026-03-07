import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
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
    private parseDuration;
    private fingerprint;
    private createSession;
    signup(dto: SignupDto, uid?: string, userAgent?: string, ip?: string): Promise<{
        message: string;
        auth: Auth;
        verificationRequired: boolean;
    } | {
        auth: Auth;
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        verificationRequired?: undefined;
    }>;
    login(dto: LoginDto, userAgent?: string, ip?: string): Promise<{
        message: string;
        auth: Auth;
        verificationRequired: boolean;
    } | {
        auth: Auth;
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        verificationRequired?: undefined;
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
}
