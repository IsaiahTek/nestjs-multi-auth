import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordAuthStrategy } from './strategies/password.strategy';
import { GoogleAuthStrategy } from './strategies/google.strategy';
import { Session } from './entities/session.entity';
import { AuthUserService } from './interfaces/auth-user-service.interface';
export declare class AuthService {
    private jwtService;
    private passwordStrategy;
    private googleStrategy;
    private sessionRepository;
    private authUserService;
    constructor(jwtService: JwtService, passwordStrategy: PasswordAuthStrategy, googleStrategy: GoogleAuthStrategy, sessionRepository: Repository<Session>, authUserService: AuthUserService);
    private generateTokens;
    private fingerprint;
    private createSession;
    signup(dto: SignupDto, userAgent?: string, ip?: string): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto, userAgent?: string, ip?: string): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(refreshToken: string, currentUserAgent: string, currentIp?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken?: string): Promise<void>;
}
