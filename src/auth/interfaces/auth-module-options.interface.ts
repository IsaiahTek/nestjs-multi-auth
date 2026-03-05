import { Type, DynamicModule, ForwardReference } from '@nestjs/common';
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
     * Optional list of modules to import into the AuthModule context.
     * Use this if your external UserService requires specific database providers.
     */
    imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;

    /**
     * Provide a class to be instantiated by AuthModule. 
     * (Warning: causes a new instance to be created unless globally provided)
     */
    userService?: Type<AuthUserService>;

    /**
     * Provide an existing instance of a service (e.g. from an imported UserModule)
     */
    useExisting?: Type<AuthUserService>;

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
