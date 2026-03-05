import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import type { Response, Request } from 'express';
export declare class AuthController {
    private authService;
    private options;
    constructor(authService: AuthService, options: AuthModuleOptions);
    private getDynamicPath;
    private setCookies;
    signup(dto: SignupDto, res: Response, req: Request): Promise<{
        message: string;
        auth: import("..").Auth;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    } | {
        message: string;
        auth: import("..").Auth;
        tokens?: undefined;
    }>;
    login(dto: LoginDto, res: Response, req: Request): Promise<{
        message: string;
        auth: import("..").Auth;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    } | {
        message: string;
        auth: import("..").Auth;
        tokens?: undefined;
    }>;
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
    logout(req: Request, res: Response, dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
}
