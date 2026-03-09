import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyDto, ResendVerificationDto } from './dto/verify.dto';
import { EnrollMfaDto, ActivateMfaDto } from './dto/mfa.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import type { Response, Request } from 'express';
export declare class AuthController {
    private authService;
    private options;
    constructor(authService: AuthService, options: AuthModuleOptions);
    private getTransports;
    private getDynamicPath;
    private setCookies;
    signup(dto: SignupDto, res: Response, req: Request): Promise<any>;
    login(dto: LoginDto, res: Response, req: Request): Promise<any>;
    verify(dto: VerifyDto, res: Response, req: Request): Promise<any>;
    resendVerification(dto: ResendVerificationDto): Promise<{
        message: string;
    }>;
    link(dto: SignupDto, req: any, res: Response): Promise<any>;
    refresh(req: Request, res: Response, dto: RefreshTokenDto): Promise<{
        message: string;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    } | {
        message: string;
        tokens?: undefined;
    }>;
    enrollMfa(req: any, dto: EnrollMfaDto): Promise<{
        secret: string;
        otpauth: string;
    }>;
    activateMfa(req: any, dto: ActivateMfaDto): Promise<{
        message: string;
    }>;
    logout(req: Request, res: Response, dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    all(): Promise<import("..").Auth[]>;
    viewAll(req: any): Promise<import("..").Auth[]>;
    deleteAccount(req: any, res: Response): Promise<{
        message: string;
    }>;
    deleteAuthMethod(req: any, authId: string): Promise<void>;
}
