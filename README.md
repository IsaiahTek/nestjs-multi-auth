# NestJS Multi-Auth

Build a complete authentication system in NestJS — without Firebase or Auth0.

nestjs-multi-auth is a self-hosted identity provider that handles:
- JWT + refresh tokens
- OAuth (Google, Facebook, Apple)
- Magic links (passwordless login)
- MFA / 2FA (TOTP)
- Account linking (multiple login methods per user)

All without coupling to your User entity or database schema.

## When should you use this?

Use this library if:
- You don’t want to build auth from scratch
- You want a Firebase/Auth0 alternative inside your NestJS backend
- You need multiple login methods (email, Google, phone, etc.)
- You want a clean separation between authentication and user profiles

Do NOT use this if:
- You only need simple JWT authentication
- You are already using an external auth provider (Firebase, Auth0)

## What you get

### Authentication
- JWT + refresh token rotation
- Cookie or Bearer transport

### Login Methods
- Email, Phone, Username
- Google, Facebook, Apple

### Advanced Features
- Account linking (multiple identities per user)
- Magic links (passwordless login)
- MFA / 2FA (TOTP)

### Identity System
- Firebase-style UID system
- Completely decoupled from your User model

---

## Testing & Quality

`nestjs-multi-auth` is built with a focus on reliability and code quality.

- **100% Passing Tests**: Comprehensive suite of unit and integration tests covering all strategies, MFA logic, and module compilation.
- **Robust Infrastructure**: Integration tests use standardized mocking for `DataSource` and `ThrottlerGuard`, ensuring stable and predictable verification.
- **Standardized Security**: Follows modern security best practices, including secure random value generation using Node.js's native `crypto` module.

To run the tests locally:

```bash
npm test
```

---

## Installation

Install the library using npm:

```bash
npm install nestjs-multi-auth
```

Ensure you have the required peer dependencies installed in your NestJS project:

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt class-validator bcrypt typeorm
```

#### Optional Dependencies
If you want to use the local event system:
```bash
npm install @nestjs/event-emitter
```

```typescript
import { Module } from '@nestjs/common';
import { AuthModule, AuthStrategy } from 'nestjs-multi-auth';

@Module({
  imports: [
    AuthModule.register({
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    }),
  ],
})
export class AppModule {}
```
---

## Quick Start

### 1. Register the `AuthModule`

#### Synchronous Registration

Import and configure the `AuthModule` in your root `AppModule`. No external service implementation is required!

```
```

#### Asynchronous Registration (`forRootAsync`)

Use `AuthModule.forRootAsync()` when your configuration depends on other providers (e.g., a `ConfigService`):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from 'nestjs-multi-auth';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        jwtSecret: config.get('JWT_SECRET'),
        jwtRefreshSecret: config.get('JWT_REFRESH_SECRET'),
        appName: config.get('APP_NAME'),
      }),
    }),
  ],
})
export class AppModule {}
```

---

## Identity Provider (Firebase Style)

The library is a pure **Identity Provider**. It manages credentials and sessions but knows nothing about your application's user profiles.

1.  **Identity (UID)**: Every person has a unique `uid` managed by the library.
2.  **Multiple Auth Methods**: One `uid` can be linked to multiple authentication methods (Google, Password, etc.).
3.  **Application Users**: Your application creates its own `User` table and links it to the library's `uid`.

### Example Integration

```typescript
@Controller('users')
export class UserController {
  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async createProfile(@Req() req, @Body() dto) {
    // req.user contains { uid: string, sessionId: string }
    const { uid } = req.user;
    
    return this.userService.create({
      authUid: uid,
      ...dto
    });
  }
}
```

```typescript
// Basic Registration
AuthModule.register({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  // No user service required!
})
```

### The `AuthCredential` Type

When a request is authenticated, `request.user` is populated with the following shape, exported as `AuthCredential`:

```typescript
import type { AuthCredential } from 'nestjs-multi-auth';

// AuthCredential = { uid: string; sessionId: string }
```

---

## Identity Verification (OTPs) & MFA

The library includes a pluggable verification system to confirm identities via Email or Phone. OTPs are triggered in the following scenarios:

1.  **Multi-Factor Authentication (2FA)**: If a user has any enabled MFA methods (TOTP, Email, SMS), verification is **always** required during login and signup.
2.  **Passwordless Authentication**: When using a local method (`EMAIL`, `PHONE`, `USERNAME`) **without a password**, an OTP is always sent as the primary credential.
3.  **Mandatory Verification**: If `verificationRequired: true` is configured, verification is enforced for any **unverified** identity.
    - **OAuth Note**: Verified OAuth providers (e.g., Google with `email_verified: true`) automatically bypass this unless 2FA is enabled.
    - **Identifier-Level**: Verification is tracked per-identifier. Successful verification marks the specific method and all its identifiers as verified.

#### Smart Delivery (Cross-Auth)
If a user authenticates via a non-verifiable method (like a **USERNAME**), the system automatically:
- Searches all linked identifiers across **all** authentication methods for that user.
- Prioritizes verified **EMAIL** or **PHONE** numbers for delivery.
- Marks all identifiers for the current auth method as verified once the OTP is confirmed.

### 1. Implement `AuthNotificationProvider`

Create a service to deliver the verification codes (SMS or Email). You can use any service, such as [notifyc-nestjs](https://github.com/IsaiahTek/notifyc-nestjs):

```typescript
import { AuthNotificationProvider } from 'nestjs-multi-auth';
import { NotifycService } from 'notifyc-nestjs';

@Injectable()
export class MyNotificationProvider implements AuthNotificationProvider {
  constructor(private notifyc: NotifycService) {}

  async sendVerificationCode(to: string, code: string, type: 'email' | 'phone') {
    await this.notifyc.send({
      to,
      subject: 'Your Verification Code',
      message: `Your code is: ${code}`,
      transport: type === 'email' ? 'SMTP' : 'SMS',
    });
  }
}
```

### 2. Configure the Module

```typescript
AuthModule.register({
  // ... other options
  notificationProvider: MyNotificationProvider,
  verificationRequired: true, // If true, login is blocked until verified
  
  // Pass the module that provides NotifycService
  imports: [NotifycModule], 
})
```

### 3. Verification Endpoints

- `POST /auth/verify`: Accepts `{ uid, code }`. Upon success, it sets `isVerified: true` and **issues the final Access and Refresh tokens** (completing the login/signup flow).
- `POST /auth/resend-verification`: Accepts `{ uid }`. Triggers a new code via the provider.

---

## Magic Links

Magic links provide a fully **passwordless login experience** via email. The library generates a short-lived, cryptographically signed token, constructs a callback URL, and delivers it to the user via your `notificationProvider`. No password is ever exchanged.

### How It Works

1. **Request**: The client sends the user's email to `POST /auth/magic-link`. The library generates a signed token (valid for 15 minutes), saves a hashed copy, and calls `notificationProvider.sendMagicLink(email, link)` with the full callback URL.
2. **Click**: The user clicks the link in their inbox, which navigates them to `frontendUrl + /auth/magic-callback?token=<token>&email=<email>`.
3. **Verify**: Your frontend (or a redirect handler) calls `GET /auth/magic-callback?token=<token>`. The library validates the token, logs the user in, and returns the standard access + refresh tokens.

### 1. Implement `sendMagicLink` in your Provider

Add the optional `sendMagicLink` method to your existing `AuthNotificationProvider`:

```typescript
import { AuthNotificationProvider } from 'nestjs-multi-auth';

@Injectable()
export class MyNotificationProvider implements AuthNotificationProvider {
  constructor(private mailer: MailerService) {}

  // Required for OTP / verification codes
  async sendVerificationCode(to: string, code: string, type: 'email' | 'phone') {
    await this.mailer.send({ to, subject: 'Your Code', text: `Code: ${code}` });
  }

  // Optional — enables Magic Link login
  async sendMagicLink(to: string, link: string) {
    await this.mailer.send({
      to,
      subject: 'Your Magic Login Link',
      html: `<p>Click <a href="${link}">here</a> to log in. This link expires in 15 minutes.</p>`,
    });
  }
}
```

### 2. Configure `frontendUrl`

The library constructs the magic link as:

```
{frontendUrl}/auth/magic-callback?token={token}&email={email}
```

Set this in your module configuration:

```typescript
AuthModule.register({
  // ...
  frontendUrl: 'https://myapp.com',
  notificationProvider: MyNotificationProvider,
})
```

### 3. Magic Link Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/magic-link` | Request a magic login link for an email address. |
| `GET` | `/auth/magic-callback?token=<token>` | Validate the token and issue access + refresh tokens. |

> [!NOTE]
> Only email addresses that already have an account in the system can receive a magic link. If the email is not recognized, a `400 Bad Request` is returned.

> [!TIP]
> Magic links are **single-use** and expire after 15 minutes (controlled by `otpExpiresIn`). The callback endpoint respects your configured `transport` (cookie or bearer), just like `signin`.

---

## Password Management

The library provides a complete, secure password lifecycle — from forgotten passwords to in-session updates and emergency account lockdowns.

### Forgot Password

Initiate a password reset by supplying one identifying field (email, phone, or username). A 6-digit OTP is sent via your `notificationProvider`.

```
POST /auth/forgot-password
```
```json
{ "email": "user@example.com" }
// OR
{ "phone": "+2348011223344" }
// OR
{ "username": "johndoe" }
```

> [!NOTE]
> The response is always `{ "message": "If an account exists, a reset code has been sent." }` regardless of whether the account was found, preventing user enumeration.

### Reset Password

Submit the OTP received via email/SMS together with the new password.

```
POST /auth/reset-password
```
```json
{
  "uid": "<uid-from-forgot-password-response>",
  "code": "123456",
  "newPassword": "newSecurePassword!"
}
```

On success, **all active sessions are invalidated** as a security measure.

### Update Password (Authenticated)

Change the password for a currently logged-in user. Requires the current password.

```
PATCH /auth/password
Authorization: Bearer <access_token>
```
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

If `sendPasswordChangedNotification` is implemented in your provider, the library will automatically send a security alert email containing the request IP, user agent, and a one-click "Secure My Account" link.

### Secure Account (Emergency Lock)

When a user clicks the "Secure My Account" link in a security alert email, it calls this endpoint to immediately lock all auth methods and invalidate all sessions.

```
POST /auth/secure-account?uid=<uid>
```
```json
{ "token": "<token-from-email-link>" }
```

After locking, the user must reset their password to regain access.

### Implement `sendPasswordChangedNotification` in your Provider

```typescript
@Injectable()
export class MyNotificationProvider implements AuthNotificationProvider {
  async sendVerificationCode(to: string, code: string, type: 'email' | 'phone') { /* ... */ }

  // Optional — triggers on PATCH /auth/password
  async sendPasswordChangedNotification(to: string, context: {
    ip: string;
    userAgent: string;
    secureAccountLink: string;
  }) {
    await this.mailer.send({
      to,
      subject: 'Your password was changed',
      html: `
        <p>Your password was recently changed from IP <strong>${context.ip}</strong>.</p>
        <p>If this wasn't you, <a href="${context.secureAccountLink}">secure your account immediately</a>.</p>
      `,
    });
  }
}
```

---

## Multi-Factor Authentication (TOTP)

The library has built-in support for TOTP-based 2FA (e.g., Google Authenticator, Authy). Configure the display name shown in authenticator apps with the `appName` option.

### Enrollment Flow

1. **Enroll**: Call `POST /auth/mfa/enroll` with `{ type: "TOTP" }`. Returns a `secret` and an `otpauth` URI that you render as a QR code for the user to scan.
2. **Activate**: Call `POST /auth/mfa/activate` with `{ type: "TOTP", code: "<6-digit-code>" }` to verify a successful scan and enable 2FA.

Once activated, subsequent logins will return `{ mfaRequired: true }` instead of tokens. The client should then prompt the user for their TOTP code and complete the flow.

---

## Account Linking & Multi-OAuth

A logged-in user can link additional authentication methods to their existing account (same `uid`). This includes both local methods (Email/Password, Phone) and multiple social accounts simultaneously (e.g., linking both Google AND Facebook to the same user).

```
POST /auth/link
Authorization: Bearer <access_token>
```

The request body follows the same shape as `POST /auth/signup`. The new credential will be linked to the same identity as the current session.

- **Unified Identity**: All linked methods share the same `uid`, but have their own `authId`.
- **Social Linking**: Connect multiple OAuth providers to a single account without creating separate identities.
- **Verification**: If verification is required, linked methods must be verified independently before they can be used for login.

---

## Guards and Decorators

This library is **Secure by Default**. Once registered, every endpoint in your application will require a valid JWT unless you specify otherwise.

### 1. `@Public()`
Use the `@Public()` decorator to bypass authentication for specific controllers or individual routes.

```typescript
import { Public } from 'nestjs-multi-auth';

@Public()
@Controller('status')
export class StatusController {}
```

### 2. `@OptionalAuth()`
Use the `@OptionalAuth()` decorator when you want a route to attempt authentication but still allow guest access. If a valid token is provided, `request.user` will be populated; otherwise, it will be `null` and the request will proceed.

```typescript
import { OptionalAuth, CurrentAuth } from 'nestjs-multi-auth';  

@OptionalAuth()
@Get('feed')
getFeed(@CurrentAuth() user: AuthCredential | null) {
  return user ? this.getPersonalizedFeed(user) : this.getGuestFeed();
}
```

### 3. `@CurrentAuth()`
Use the `@CurrentAuth()` decorator to conveniently inject the authenticated user's credential into your route handler.

```typescript
import { CurrentAuth } from 'nestjs-multi-auth';
import type { AuthCredential } from 'nestjs-multi-auth';

@Get('profile')
getProfile(@CurrentAuth() user: AuthCredential) {
  return this.userService.findByUid(user.uid);
}
```

### 4. Manual Guards
If you've disabled the global guard via `disableGlobalGuard: true`, you can apply the guards manually:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'nestjs-multi-auth';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {}
```

> [!WARNING]
> If `disableGlobalGuard: true` is configured and no manual guard is applied, decorators like `@CurrentAuth()` will return `undefined` because the authentication logic never runs for that request.

---

## Auth Transports (Cookie vs Bearer)

The library provides extreme flexibility for how your front-end interacts with tokens. You must specify your `transport` array in the `AuthModule.register()` configuration.

- `AuthTransport.COOKIE`: Tokens are automatically set as secure, HTTP-only `Set-Cookie` headers upon Login/Signup. The `/refresh` endpoint automatically reads the cookie (`refresh_token`) and issues new cookies. The `/logout` endpoint automatically clears these cookies. **Zero manual token management is required on your frontend client.**
- `AuthTransport.BEARER`: Tokens are returned in the JSON response body (`tokens: { accessToken, refreshToken }`). The `/refresh` and `/logout` endpoints seamlessly accept a JSON payload containing `{"refreshToken": "..."}`, or gracefully fallback to checking the `Authorization: Bearer <token>` header.
- Combine both by passing `transport: [AuthTransport.COOKIE, AuthTransport.BEARER]` to set cookies **and** return tokens in the JSON body simultaneously.

---

## Provided Endpoints

The library automatically mounts the following endpoints under the `/auth` prefix:

| Method | Endpoint | Auth Required | Payload | Description |
|--------|----------|:---:|:---|-------------|
| `POST` | `/auth/signup` | - | `SignupDto` | Register a new identity. |
| `POST` | `/auth/signin` | - | `LoginDto` | Authenticate and receive tokens. |
| `POST` | `/auth/verify` | - | `VerifyDto` | Submit an OTP to complete verification. |
| `POST` | `/auth/resend-verification` | - | `ResendVerificationDto` | Resend the OTP code. |
| `POST` | `/auth/forgot-password` | - | `ForgotPasswordDto` | Request a password reset OTP via email/phone/username. |
| `POST` | `/auth/reset-password` | - | `ResetPasswordDto` | Reset password using the OTP code. |
| `PATCH` | `/auth/password` | ✅ | `UpdatePasswordDto` | Update password for the current authenticated session. |
| `POST` | `/auth/secure-account?uid=` | - | `SecureAccountDto` | Lock account via a one-click security email link. |
| `POST` | `/auth/magic-link` | - | `MagicLinkRequestDto` | Request a magic login link for an email address. |
| `GET` | `/auth/magic-callback?token=` | - | — | Verify the magic link token and issue session tokens. |
| `POST` | `/auth/refresh` | - | `RefreshTokenDto` | Rotate the access token using a refresh token. |
| `POST` | `/auth/logout` | - | `RefreshTokenDto` | Invalidate the current session. |
| `POST` | `/auth/link` | ✅ | `SignupDto` | Link a new auth method to the current account. |
| `POST` | `/auth/mfa/enroll` | ✅ | `EnrollMfaDto` | Begin TOTP MFA enrollment. |
| `POST` | `/auth/mfa/activate` | ✅ | `ActivateMfaDto` | Confirm TOTP setup with a live code. |
| `GET` | `/auth` | Optional | — | List all auth identities (admin/debug). |
| `GET` | `/auth/me` | ✅ | — | View current identity details. |
| `GET` | `/auth/me/methods` | ✅ | — | View all auth methods for the current user. |
| `DELETE` | `/auth/account` | ✅ | — | Delete the user's account and all data. |
| `DELETE` | `/auth/method/:id` | ✅ | — | Delete a specific auth method by ID. |

---

## Payload Definitions (DTOs)

These DTOs define the expected request body for each endpoint.

### `SignupDto` / `LoginDto`
Used for both registration (`/auth/signup`) and authentication (`/auth/signin`).

| Field | Type | Required | Description |
|---|---|---|---|
| `method` | `AuthStrategy` | ✅ | The authentication strategy (e.g., `EMAIL`, `PHONE`, `GOOGLE`). |
| `provider` | `OAuthProviderType` | - | Required if `method` is `OAUTH` or a social strategy. |
| `email` | `string` | - | Required if `method` is `EMAIL`. |
| `phone` | `string` | - | Required if `method` is `PHONE`. |
| `username` | `string` | - | Required if `method` is `USERNAME`. |
| `password` | `string` | - | User's password (min 6 chars). |
| `token` | `string` | - | OAuth token or verification token for automated flows. |

### `VerifyDto`
Used to verify an identity with a one-time code (`/auth/verify`).

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | `string` | ✅ | The unique identity ID (UUID) being verified. |
| `code` | `string` | ✅ | The 6-digit verification code sent via Email or SMS. |

### `ResendVerificationDto`
Used to request a new verification code (`/auth/resend-verification`).

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | `string` | ✅ | The unique identity ID (UUID) to resend the code for. |

### `ForgotPasswordDto`
Used to initiate a password reset (`/auth/forgot-password`).

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | - | Email address of the account. |
| `phone` | `string` | - | Phone number of the account. |
| `username` | `string` | - | Username of the account. |

> At least one of `email`, `phone`, or `username` must be provided.

### `ResetPasswordDto`
Used to reset the password after receiving an OTP (`/auth/reset-password`).

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | `string` | ✅ | The unique identity ID. |
| `code` | `string` | ✅ | The 6-digit OTP code received via email/SMS. |
| `newPassword` | `string` | ✅ | The new password (min 6 chars). |

### `UpdatePasswordDto`
Used to change the password for an authenticated user (`PATCH /auth/password`).

| Field | Type | Required | Description |
|---|---|---|---|
| `currentPassword` | `string` | ✅ | The user's current password. |
| `newPassword` | `string` | ✅ | The new password (min 6 chars). |

### `SecureAccountDto`
Used to lock an account via a security email link (`/auth/secure-account?uid=`).

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | ✅ | The signed security token included in the alert email link. |

### `MagicLinkRequestDto`
Used to request a magic login link (`/auth/magic-link`).

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | ✅ | The email address to send the magic link to. |

### `RefreshTokenDto`
Used to rotate tokens or logout (`/auth/refresh`, `/auth/logout`).

| Field | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | `string` | - | The refresh token. Required if not using HTTP-only cookies. |

### `EnrollMfaDto`
Used to start MFA enrollment (`/auth/mfa/enroll`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `MfaType` | ✅ | The type of MFA to enroll (e.g., `TOTP`). |

### `ActivateMfaDto`
Used to finalize MFA activation (`/auth/mfa/activate`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `MfaType` | ✅ | The type of MFA to activate. |
| `code` | `string` | ✅ | The 6-digit code from the authenticator app. |

---

## Enumerations (Enums)

### `AuthStrategy`
The available authentication methods.

- `EMAIL`
- `PHONE`
- `USERNAME`
- `GOOGLE`
- `FACEBOOK`
- `APPLE`

### `OAuthProviderType`
Social authentication providers.

- `GOOGLE`
- `FACEBOOK`
- `APPLE`

### `MfaType`
Supported MFA methods.

- `TOTP` (Time-based One-Time Password)

### `AuthTransport`
How tokens are delivered to and sent from the client.

- `cookie`: Uses secure, HTTP-only session cookies.
- `bearer`: Returns tokens in the JSON response body.
- `both`: Enables both cookie and bearer transport simultaneously.

---

*(All endpoints are automatically documented if you have `@nestjs/swagger` configured in your root app).*

---

## Event Hooks

The library emits events for all major authentication actions using `@nestjs/event-emitter`. This allows you to build decoupled, reactive logic such as:
- Sending a welcome email after signup.
- Logging login attempts.
- Invalidating external caches on logout.

### 1. Enable Events
First, ensure you have `@nestjs/event-emitter` installed and registered in your root `AppModule`:

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AuthModule.register({ ... }),
  ],
})
export class AppModule {}
```

### 2. Listen for Events
Use the `@OnEvent()` decorator with the `AuthEvents` enum to handle specific actions:

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { AuthEvents } from 'nestjs-multi-auth';

@Injectable()
export class NotificationService {
  @OnEvent(AuthEvents.SIGNUP)
  async handleUserSignup(payload: any) {
    // payload = { uid, method, email/phone/username }
    console.log(`User ${payload.uid} signed up via ${payload.method}`);
  }

  @OnEvent(AuthEvents.LOGIN)
  async handleUserLogin(payload: any) {
    // payload = { uid, sessionId, method }
    console.log(`User ${payload.uid} logged in!`);
  }
}
```

### Available Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `auth.signup` | `{ uid, method, ...identifier }` | A new account is successfully created. |
| `auth.login` | `{ uid, sessionId, method }` | A user successfully authenticates. |
| `auth.logout` | `{ uid, sessionId }` | A session is invalidated. |
| `auth.verify.request` | `{ uid, type, to }` | A verification code is sent. |
| `auth.verify.success` | `{ uid }` | A code is successfully confirmed. |
| `auth.mfa.enroll` | `{ uid, type }` | MFA enrollment begins. |
| `auth.mfa.activate` | `{ uid, type }` | MFA is fully enabled. |
| `auth.password.forgot` | `{ uid }` | Password reset is requested. |
| `auth.password.reset` | `{ uid }` | Password is changed via OTP. |
| `auth.password.update` | `{ uid }` | Password is changed via PATCH. |
| `auth.account.secure` | `{ uid }` | Account is locked via security link. |
| `auth.account.delete` | `{ uid }` | Entire account is deleted. |

> [!TIP]
> The event system is completely optional. If you don't register `EventEmitterModule`, the library will skip event emission without throwing errors.

---

## Configuration Reference

All options for `AuthModule.register()` / `AuthModule.forRootAsync()`:

| Option | Type | Default | Description |
|---|---|---|---|
| `jwtSecret` | `string` | — | **Required.** Secret for signing Access Tokens. |
| `jwtRefreshSecret` | `string` | — | **Required.** Secret for signing Refresh Tokens. |
| `accessTokenExpiresIn` | `string` | `'15m'` | Access token expiration. |
| `refreshTokenExpiresIn` | `string` | `'7d'` | Refresh token & session duration. |
| `transport` | `AuthTransport \| AuthTransport[]` | `[BEARER]` | Token delivery method(s). |
| `enabledStrategies` | `AuthStrategy[]` | All | Which auth strategies to activate. |
| `disableGlobalGuard` | `boolean` | `false` | Disable the automatic global JWT guard. |
| `disableController` | `boolean` | `false` | Disable the built-in `AuthController`. |
| `notificationProvider` | `Type<AuthNotificationProvider>` | — | Class for sending OTP codes. |
| `verificationRequired` | `boolean` | `false` | Block login until identity is verified. |
| `imports` | `any[]` | — | Modules to import into the Auth context (e.g., for `notificationProvider`). |
| `appName` | `string` | `'NestJS Auth'` | App name shown in TOTP authenticator apps. |
| `googleClientId` | `string` | — | Required for Google OAuth strategy. |
| `facebookAppId` | `string` | — | Required for Facebook OAuth strategy. |
| `facebookAppSecret` | `string` | — | Required for Facebook OAuth strategy. |
| `appleClientId` | `string` | — | Required for Apple OAuth strategy. |
| `appleTeamId` | `string` | — | Optional for Apple OAuth strategy. |
| `emailRequiresPassword` | `boolean` | `true` | Require a password for email-based auth. |
| `usernameRequiresPassword` | `boolean` | `true` | Require a password for username-based auth. |
| `phoneRequiresPassword` | `boolean` | `false` | Require a password for phone-based auth. |
| `allowedPhonePrefixes` | `string[]` | — | Restrict phone auth to specific country codes. |
| `frontendUrl` | `string` | — | Base URL of your frontend app. Used to build Magic Links and Security Alert links. |
| `otpExpiresIn` | `number` | `15` | OTP validity in minutes. Also controls magic link expiry. |
| `otpResendInterval` | `number` | `60` | Minimum seconds between OTP resend requests. |
| `throttlerLimit` | `number` | `10` | Max requests per `throttlerTtl` window. |
| `throttlerTtl` | `number` | `60` | Throttle window duration in seconds. |
| `disableThrottler` | `boolean` | `false` | Disable the built-in rate limiting entirely. |
| `autoMigrate` | `boolean` | `false` | Automatically run database schema migrations on startup. |
| `debugMode` | `boolean` | `false` | Enable debug mode (allows using `defaultOtp`). |
| `defaultOtp` | `string` | — | A static OTP value to use when `debugMode` is enabled. |
| `forceVerificationOnGoogle` | `boolean` | `false` | Force OTP validation for Google OAuth, bypassing Google's `email_verified`. |

---
## Advanced Config

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule, AuthTransport, AuthStrategy } from 'nestjs-multi-auth';

@Module({
  imports: [
    AuthModule.register({
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      
      // Optional: defaults to [AuthTransport.BEARER]
      transport: [AuthTransport.COOKIE, AuthTransport.BEARER],
      
      // Optional: Enable individual strategies
      enabledStrategies: [
        AuthStrategy.EMAIL, 
        AuthStrategy.GOOGLE, 
        AuthStrategy.PHONE
      ],

      // Required for Google strategy
      googleClientId: process.env.GOOGLE_CLIENT_ID,

      // Required for Facebook strategy
      facebookAppId: process.env.FACEBOOK_APP_ID,
      facebookAppSecret: process.env.FACEBOOK_APP_SECRET,

      // Required for Apple strategy
      appleClientId: process.env.APPLE_CLIENT_ID,
      appleTeamId: process.env.APPLE_TEAM_ID,

      // Optional: If strategy PHONE is enabled, defaults to false
      phoneRequiresPassword: true, 
      
      // Optional: List of allowed phone number prefixes (e.g. ['+234', '+44']).
      allowedPhonePrefixes: ['+234', '+44'],

      // Optional: App name shown in TOTP authenticator apps
      appName: 'MyApp',

      // Optional: Rate limiting (defaults: limit=10, ttl=60s)
      throttlerLimit: 10,
      throttlerTtl: 60,

      // Optional: defaults to false.
      // disableController: true,
      // disableGlobalGuard: true,
      // disableThrottler: true,

      // Optional: Durations and Intervals
      otpExpiresIn: 15,                // 15 minutes
      otpResendInterval: 60,           // 60 seconds
      accessTokenExpiresIn: '15m',     // Access token
      refreshTokenExpiresIn: '7d',     // Refresh token & Session

      // Required for Magic Links and Security Alert emails
      frontendUrl: 'https://myapp.com',

      // Optional: Run DB migrations automatically on startup
      autoMigrate: true,
    }),
  ],
})
export class AppModule {}
```


---

## Common Issues & Troubleshooting

### `@CurrentAuth()` returns `undefined`
If your `@CurrentAuth()` decorator returns `undefined` even when you are sending a valid token, check the following:

1.  **Global Guard Disabled**: Ensure `disableGlobalGuard` is not set to `true` in your `AuthModule` configuration. If it is, you **must** manually apply `@UseGuards(JwtAuthGuard)` to your controller or route.
2.  **Async Configuration**: If using `forRootAsync`, ensure your factory is correctly returning the `jwtSecret`.
3.  **Missing Strategy**: Ensure the strategy you are using (e.g., `EMAIL`) is included in `enabledStrategies` (or leave it empty to enable all).

### 401 Unauthorized on Public Routes
If you are getting 401 errors on routes marked with `@Public()`, ensure that the `AuthModule` is correctly registered as a Global module and that the `JwtAuthGuard` (registered as an `APP_GUARD`) is successfully reading the reflectors.

---

## Entity Requirements

Because this library is decoupled, it manages its own tracking entities (`Auth`, `Session`, `MfaMethod`, `OtpToken`, `OAuthProvider`, `AuthIdentifier`). These entities use an opaque `uid: string` to identify users.

To use the Auth functionality, ensure `TypeOrmModule.forRoot()` is initialized in your consuming app.

---

## License

ISC
