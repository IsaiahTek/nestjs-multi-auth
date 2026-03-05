import { Type, DynamicModule, ForwardReference } from '@nestjs/common';
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
     * Optional list of modules to import into the AuthModule context.
     * Use this if your external UserService requires specific database providers.
     */
    imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;

    /**
     * If true, the built-in AuthController will NOT be registered.
     * Use this if you want to implement your own auth endpoints.
     */
    disableController?: boolean;

    /**
     * Preferred transport mode for tokens (defaults to ['bearer'])
     */
    transport?: AuthTransport[];

    /**
     * If true, the global JwtAuthGuard will NOT be registered.
     * Default: false (global guard is enabled by default)
     */
    disableGlobalGuard?: boolean;
}
