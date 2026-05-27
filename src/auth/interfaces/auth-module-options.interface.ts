import { Type, DynamicModule, ForwardReference } from '@nestjs/common';
import { AuthTransport, AuthStrategy } from '../enums/auth-type.enum';
import { AuthNotificationProvider } from './auth-notification-provider.interface';
import { Request } from 'express';

export const AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';

export interface CookieNameConfig {
  accessTokenName: string;
  refreshTokenName: string;
}

export interface AuthModuleOptions {
  /**
   * Secret key for signing Access Tokens
   */
  jwtSecret: string;

  /**
   * Optional: Custom cookie name resolver
   */
  cookieNameResolver?: (req: Request) => CookieNameConfig;

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
}
