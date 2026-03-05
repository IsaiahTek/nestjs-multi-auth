import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordAuthStrategy } from './strategies/password.strategy';
import { GoogleAuthStrategy } from './strategies/google.strategy';
import { OtpAuthStrategy } from './strategies/otp.strategy';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
export declare class AuthService {
    private jwtService;
    private passwordStrategy;
    private googleStrategy;
    private otpStrategy;
    private sessionRepository;
    private authRepo;
    private options;
    private readonly logger;
    constructor(jwtService: JwtService, passwordStrategy: PasswordAuthStrategy, googleStrategy: GoogleAuthStrategy, otpStrategy: OtpAuthStrategy, sessionRepository: Repository<Session>, authRepo: Repository<Auth>, options: AuthModuleOptions);
    private generateTokens;
    private fingerprint;
    private createSession;
    signup(dto: SignupDto, userAgent?: string, ip?: string): Promise<{
        auth: Auth;
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto, userAgent?: string, ip?: string): Promise<{
        auth: Auth;
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(refreshToken: string, currentUserAgent: string, currentIp?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken?: string): Promise<void>;
}
