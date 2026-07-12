import { Type, DynamicModule } from '@nestjs/common';
import { AuthTransport, AuthStrategy } from '../enums/auth-type.enum';
import { AuthNotificationProvider } from './auth-notification-provider.interface';
import { Request } from 'express';
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
/**
 * @deprecated Use `AuthContext` instead
 */
export interface CookieNameConfig extends AuthContext {
}
/**
 * This gives the auth session context.
 * If your app needs to seperate auth session by subdomain or app type
 * then use this config together with `authContextResolver`
 */
export interface AuthContext {
    namespace: string;
    accessTokenName: string;
    refreshTokenName: string;
}
/**
 * How session creation is done. Default is create session for every login without reusing old/existing session.
 */
export declare enum SessionCreationPolicy {
    ALWAYS_NEW = 0,
    REUSE_DEVICE = 1
}
export interface TestAccount {
    identifier: string;
    otp: string;
}
export interface AuthModuleOptions {
    /**
     * Secret key for signing Access Tokens
     */
    jwtSecret: string;
    /**
     * Optional: Custom cookie name resolver
     * @deprecated Use `authContextResolver` instead
     */
    cookieNameResolver?: (req: Request) => CookieNameConfig;
    authContextResolver?: (req: Request) => AuthContext;
    /**
     * Optional: SameSite policy for auth cookies.
     * Defaults to 'lax' in production and 'none' in development.
     * Use 'none' for cross-subdomain local dev (e.g. admin.localhost → localhost:3002).
     * Note: 'none' sets Secure=true automatically; Chrome allows this for localhost over HTTP.
     */
    cookieSameSite?: 'lax' | 'strict' | 'none';
    /**
     * Optional: If true, cookies will be explicitly marked as Secure=true.
     * Defaults to true in production, false in development.
     * Note: 'none' sameSite policy requires cookies to be Secure.
     */
    cookieSecure?: boolean;
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
     * Optional: Path for the refresh token cookie
     * Default to '/auth/refresh'
     */
    refreshTokenPath?: string;
    /**
     * If true, the library will NOT automatically register the global JwtAuthGuard.
     *
     * IMPORTANT: When this is set to true, decorators like @CurrentAuth() will return
     * undefined unless you manually apply a guard (e.g., @UseGuards(JwtAuthGuard))
     * to the controller or route.
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
     * Facebook App ID for token verification
     */
    facebookAppId?: string;
    /**
     * Facebook App Secret for App Secret Proof security
     */
    facebookAppSecret?: string;
    /**
     * Apple Client ID (Services ID or App ID)
     */
    appleClientId?: string;
    /**
     * Apple Team ID (optional)
     */
    appleTeamId?: string;
    /**
     * Optional: List of enabled authentication strategies.
     * If not provided, all strategies are enabled by default.
     */
    enabledStrategies?: AuthStrategy[];
    /**
     * Optional: If true, email-based authentication REQUIRES a password.
     * Defaults to true.
     */
    emailRequiresPassword?: boolean;
    /**
     * Optional: If true, username-based authentication REQUIRES a password.
     * Defaults to true.
     */
    usernameRequiresPassword?: boolean;
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
    /**
     * Optional: Application name shown in TOTP apps (e.g., Google Authenticator)
     */
    appName?: string;
    /**
     * Optional: Max number of requests within the ttl (default: 10)
     */
    throttlerLimit?: number;
    /**
     * Optional: Time to live for the throttler in seconds (default: 60)
     */
    throttlerTtl?: number;
    /**
     * Optional: If true, the built-in rate limiting is disabled.
     */
    disableThrottler?: boolean;
    /**
     * Optional: List of allowed phone number prefixes (e.g. ['+234', '+44']).
     * If provided, all phone-based signups and signins must match one of these prefixes.
     */
    allowedPhonePrefixes?: string[];
    /**
     * If true, the library will automatically run migrations on startup.
     */
    autoMigrate?: boolean;
    /**
     * The URL of the frontend application (used for Magic Links and Security Alerts).
     */
    frontendUrl?: string;
    /**
     * Optional: Enable debug mode. When true, some operations can use default values (e.g., OTP).
     */
    debugMode?: boolean;
    /**
     * Optional: Default OTP to use when debugMode is true.
     */
    defaultOtp?: string;
    /**
     * Optional: If true, Google OAuth will not automatically mark new accounts/identifiers as verified during signup,
     * forcing the user to undergo the standard OTP verification flow even if Google verified their email.
     */
    forceVerificationOnGoogleSignup?: boolean;
    /**
     * Optional: If true, Google OAuth will not automatically update the account/identifier as verified during login,
     * forcing the user to undergo the standard OTP verification flow if they hadn't verified previously via OTP.
     */
    forceVerificationOnGoogleLogin?: boolean;
    /**
     * Optional: Session Creation on login or Reuse if existing
     * Default: `SessionCreationPolicy.ALWAYS_NEW` Always create on login
     */
    sessionCreationPolicy?: SessionCreationPolicy;
    /**
     * Optional: Flag to print logs in console if set to `true`.
     * Default is `false`
     */
    debug?: boolean;
    /**
     * Create session history on login, after logout, expired token, invalid token, etc.
     * Defaults to `false`. But you can set it to true for audit and other need
     */
    createSessionLogOnInvalid?: boolean;
    /**
     * Optional: Custom adapter for database operations.
     * If not provided, TypeOrmAuthAdapter is used by default.
     */
    adapter?: Type<any> | DynamicModule;
    /**
     * Optional: Pluggable provider for managing OTP lifecycle.
     * Defaults to DatabaseOtpProvider.
     * This applies to all identifier types unless overridden by `otpProviders`.
     */
    otpProvider?: Type<any>;
    /**
     * Optional: Granular per-channel OTP provider map.
     * Allows different OTP backends per identifier type.
     * Any channel not specified here falls back to `otpProvider` (or `DatabaseOtpProvider`).
     *
     * @example
     * otpProviders: {
     *   phone: TwilioOtpProvider, // Twilio Verify for phone
     *   email: DatabaseOtpProvider, // built-in database storage for email
     * }
     */
    otpProviders?: {
        email?: Type<any>;
        phone?: Type<any>;
    };
    /**
     * Optional: List of test accounts. If an OTP is requested for one of these identifiers,
     * the configured static OTP is used and the notification provider is bypassed.
     */
    testAccounts?: TestAccount[];
}
