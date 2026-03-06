import { Type } from '@nestjs/common';
import { AuthTransport, AuthStrategy } from '../auth-type.enum';
import { AuthNotificationProvider } from './auth-notification-provider.interface';
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
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
    accessTokenExpiresIn?: string;
    /**
     * Optional: Custom expiration for Refresh Tokens (e.g., '7d')
     */
    refreshTokenExpiresIn?: string;
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
    /**
     * Optional: List of modules to import into the AuthModule context.
     * Use this if your notificationProvider requires specific providers from other modules.
     */
    imports?: any[];
    /**
     * Google OAuth Client ID for token verification
     */
    googleClientId?: string;
    /**
     * Optional: List of enabled authentication strategies.
     * If not provided, all strategies are enabled by default.
     */
    enabledStrategies?: AuthStrategy[];
    /**
     * Optional: If true, phone-based authentication REQUIRES a password.
     * Defaults to false (password-less phone auth allowed).
     */
    phoneRequiresPassword?: boolean;
    /**
     * Optional: Duration for OTP expiration in minutes.
     * Defaults to 15 minutes.
     */
    otpExpiresIn?: number;
    /**
     * Optional: Minimum interval between OTP resends in seconds.
     * Defaults to 60 seconds.
     */
    otpResendInterval?: number;
}
