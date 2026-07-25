import { AuthService } from './auth.service';
import { LoginDto } from './dto/requests/login.dto';
import { SignupDto } from './dto/requests/signup.dto';
import { VerifyDto, ResendVerificationDto } from './dto/requests/verify.dto';
import { EnrollMfaDto, ActivateMfaDto, VerifyMfaLoginDto, DeactivateMfaDto } from './dto/requests/mfa.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { MagicLinkRequestDto } from './dto/requests/magic-link.dto';
import { SecureAccountDto } from './dto/requests/secure-account.dto';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import type { Response, Request } from 'express';
import { AuthContextService } from './core/auth-context.resolver';
export declare class AuthController {
    private authService;
    private options;
    private authContext;
    constructor(authService: AuthService, options: AuthModuleOptions, authContext: AuthContextService);
    private getTransports;
    private getDynamicPath;
    private setCookies;
    signup(dto: SignupDto, res: Response, req: Request): Promise<any>;
    login(dto: LoginDto, res: Response, req: Request): Promise<any>;
    verify(dto: VerifyDto, res: Response, req: Request): Promise<any>;
    resendVerification(dto: ResendVerificationDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updatePassword(req: any, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    secureAccount(uid: string, dto: SecureAccountDto): Promise<{
        message: string;
    }>;
    requestMagicLink(dto: MagicLinkRequestDto): Promise<{
        message: string;
    }>;
    verifyMagicLink(token: string, email: string, res: Response, req: Request): Promise<any>;
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
    verifyMfa(dto: VerifyMfaLoginDto, res: Response, req: Request): Promise<any>;
    deactivateMfa(req: any, dto: DeactivateMfaDto): Promise<{
        message: string;
    }>;
    logout(req: Request, res: Response, dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    me(req: any): Promise<import("./dto/responses/auth-response.dto").AuthResponseDto>;
    viewAll(req: any): Promise<import("./dto/responses/auth-response.dto").AuthResponseDto[]>;
    deleteAccount(req: any, res: Response): Promise<{
        message: string;
    }>;
    deleteAuthMethod(req: any, authId: string): Promise<void>;
}
