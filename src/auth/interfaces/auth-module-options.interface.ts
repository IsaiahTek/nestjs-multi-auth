import { Type, DynamicModule, ForwardReference } from '@nestjs/common';
import { AuthTransport } from '../auth-type.enum';
import { AuthNotificationProvider } from './auth-notification-provider.interface';

export const AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';

export interface AuthModuleOptions {
    /**
     * Secret key for signing Access Tokens
     */
    jwtSecret: string;

    /**
     * Secret key for signing Refresh Tokens
     */
    jwtRefreshSecret: string;

    /**
     * Optional: Custom expiration for Access Tokens (e.g., '15m')
     */
    jwtExpiresIn?: string;

    /**
     * Optional: Custom expiration for Refresh Tokens (e.g., '7d')
     */
    jwtRefreshExpiresIn?: string;

    /**
     * If true, the library will NOT automatically register the global JwtAuthGuard.
     * You will need to apply @UseGuards(JwtAuthGuard) manually.
     */
    disableGlobalGuard?: boolean;

    /**
     * If true, the library will NOT register the default AuthController.
     * Useful if you want to implement your own auth endpoints using AuthService.
     */
    disableController?: boolean;

    /**
     * Transport methods to support (COOKIE, BEARER, or BOTH)
     */
    transport?: AuthTransport | AuthTransport[];

    /**
     * Optional: Pluggable provider for sending notifications (OTPs).
     */
    notificationProvider?: Type<AuthNotificationProvider>;

    /**
     * If true, identities MUST be verified before they can log in.
     * Requires a notificationProvider to be configured.
     */
    verificationRequired?: boolean;
}
