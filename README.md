# NestJS Multi-Auth

A flexible, decoupled, and production-ready authentication library for NestJS applications. `nestjs-multi-auth` supports JWT/Refresh token rotation, dynamic configuration, and multiple authentication transports (Cookies and Bearer tokens), while remaining completely agnostic of your application's specific `User` entity or ORM structure.

## Features

- **Identity-Only (Firebase Style)**: Pure authentication and session management. Agnostic of your application's user profiles and database structure.
- **Grouped Identities**: Multiple login methods (Google, Password, etc.) are consolidated under a single, opaque `uid`.
- **MFA/2FA Ready**: Built-in support for Multi-Factor Authentication (Email, SMS, TOTP).
- **Secure by Default**: Automatically registers a global authentication guard.
- **Dynamic Configuration**: Configure JWT secrets, expiration times, and transport preferences dynamically.
- **Granular Strategy Selection**: Enable individual authentication methods (Email, Phone, Username, Google, Facebook, Apple).
- **Flexible Phone Auth**: Choose whether phone-based authentication requires a password or is password-less by default.
- **Multiple Auth Transports**: Supports HTTP-only Cookies, JSON body (Bearer token), or both.
- **Token Rotation**: Built-in `/refresh` and `/logout` endpoints with automatic token rotation.
- **Session Tracking**: Tracks IP and User Agent for basic session security.

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

---

## Quick Start

### 1. Register the `AuthModule`

Import and configure the `AuthModule` in your root `AppModule`. No external service implementation is required!

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

      // Optional: If strategy PHONE is enabled, defaults to false
      phoneRequiresPassword: true, 
      
      // Optional: defaults to false.
      // disableController: true,

      // Optional: Durations and Intervals
      otpExpiresIn: 15,                // 15 minutes
      otpResendInterval: 60,           // 60 seconds
      accessTokenExpiresIn: '15m',     // Access token
      refreshTokenExpiresIn: '7d',     // Refresh token & Session
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
import { OptionalAuth, CurrentUser } from 'nestjs-multi-auth';

@OptionalAuth()
@Get('feed')
getFeed(@CurrentUser() user: any) {
  return user ? this.getPersonalizedFeed(user) : this.getGuestFeed();
}
```

### 3. Manual Guards
If you've disabled the global guard via `disableGlobalGuard: true`, you can apply the guards manually:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'nestjs-multi-auth';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {}
```

---

## Auth Transports (Cookie vs Bearer)

The library provides extreme flexibility for how your front-end interacts with tokens. You must specify your `transport` array in the `AuthModule.register()` configuration.

- `AuthTransport.COOKIE`: Tokens are automatically set as secure, HTTP-only `Set-Cookie` headers upon Login/Signup. The `/refresh` endpoint automatically reads the cookie (`refresh_token`) and issues new cookies. The `/logout` endpoint automatically clears these cookies. **Zero manual token management is required on your frontend client.**
- `AuthTransport.BEARER`: Tokens are returned in the JSON response body (`tokens: { accessToken, refreshToken }`). The `/refresh` and `/logout` endpoints seamlessly accept a JSON payload containing `{"refreshToken": "..."}`, or gracefully fallback to checking the `Authorization: Bearer <token>` header.
- `AuthTransport.BOTH`: Tokens are set as cookies *and* returned in the JSON response simultaneously.

---

## Provided Endpoints

The library automatically mounts the following endpoints under the `/auth` prefix:

- `POST /auth/signup`: Accepts credentials based on strategy (e.g., `email`, `password`). Returns the registered `auth` identity and tokens.
- `POST /auth/signin`: Verifies credentials and returns the `auth` identity and tokens.
- `POST /auth/refresh`: Refreshes your access token.
- `POST /auth/logout`: Invalidates the session.

*(All endpoints are automatically documented if you have `@nestjs/swagger` configured in your root app).*

---

## Entity Requirements

Because this library is decoupled, it manages its own tracking entities (`Auth`, `Session`, `MfaMethod`). These entities use an opaque `uid: string` to identify users.

To use the Auth functionality, ensure `TypeOrmModule.forRoot()` is initialized in your consuming app.

---

## License

ISC
