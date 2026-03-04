import { Type } from '@nestjs/common';
import { AuthUserService } from './auth-user-service.interface';
import { AuthTransport } from '../auth-type.enum';

export const AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';

export interface AuthModuleOptions {
    /**
     * Secret key for signing JWTs
     */
    jwtSecret: string;

    /**
     * Expiration time for access tokens (e.g. '15m')
     */
    jwtExpiresIn?: string;

    /**
     * Secret key for refresh tokens
     */
    jwtRefreshSecret: string;

    /**
     * Expiration time for refresh tokens (e.g. '7d')
     */
    jwtRefreshExpiresIn?: string;

    /**
     * The User Service implementation that the consuming application provides
     */
    userService: Type<AuthUserService>;

    /**
     * Preferred transport mode for tokens (defaults to ['bearer'])
     */
    transport?: AuthTransport[];
}
