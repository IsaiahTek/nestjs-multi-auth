import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { OtpAuthStrategy } from './strategies/otp.strategy';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { OtpToken } from './entities/otp-token.entity';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
export declare class AuthService {
    private jwtService;
    private passwordStrategy;
    private oauthStrategy;
    private otpStrategy;
    private sessionRepository;
    private authRepo;
    private otpRepo;
    private options;
    private notificationProvider?;
    private readonly logger;
    constructor(jwtService: JwtService, passwordStrategy: LocalAuthStrategy, oauthStrategy: OAuthAuthStrategy, otpStrategy: OtpAuthStrategy, sessionRepository: Repository<Session>, authRepo: Repository<Auth>, otpRepo: Repository<OtpToken>, options: AuthModuleOptions, notificationProvider?: AuthNotificationProvider);
    private generateTokens;
    private fingerprint;
    private createSession;
    signup(dto: SignupDto, userAgent?: string, ip?: string): Promise<{
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
    verifyCode(uid: string, code: string): Promise<{
        message: string;
    }>;
    resendVerification(uid: string): Promise<{
        message: string;
    }>;
    refreshTokens(refreshToken: string, currentUserAgent: string, currentIp?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken?: string): Promise<void>;
}
