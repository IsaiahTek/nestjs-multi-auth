# Refactor OTP Architecture — nestjs-multi-auth

## Context

You are working on **nestjs-multi-auth**, a production-grade authentication library for NestJS.

## Objective

Refactor the OTP architecture to separate OTP lifecycle management from notification delivery, while maintaining full backward compatibility.

## Problem

The current implementation assumes the library always:

1. Generates the OTP
2. Stores it in the database
3. Passes the generated code to `AuthNotificationProvider.sendVerificationCode()`

This assumption prevents integration with providers like **Twilio Verify**, **Firebase Phone Authentication**, **Vonage Verify**, and **MessageBird Verify**, because these services generate, store, expire, and validate OTPs themselves — the raw code is never exposed to the library.

The authentication library must support both:

- **Internal database-managed OTPs** (current behavior)
- **External OTP providers** (Twilio Verify, Firebase Phone, etc.)

...without changing the public authentication API.

---

## Design Principles

### The authentication library IS responsible for

- Authentication
- Authorization
- Identity verification workflow
- Session management
- Password reset
- Email verification
- Phone verification
- MFA orchestration

### The authentication library is NOT responsible for

- SMS delivery
- Email delivery
- Push notifications
- WhatsApp
- OTP transport

Notification delivery remains the responsibility of the consuming application.

---

## New Architecture

Split the current OTP implementation into two abstractions.

### 1. `AuthOtpProvider` (NEW)

Responsible for the **lifecycle** of an OTP: generate, store, validate, resend, expire.

**Example implementations:**

- `DatabaseOtpProvider`
- `TwilioVerifyOtpProvider`
- `FirebasePhoneOtpProvider`
- `CustomOtpProvider`

**Interface:**

```typescript
export interface AuthOtpProvider {
  issue(request: IssueOtpRequest): Promise<IssueOtpResult>;
  verify(request: VerifyOtpRequest): Promise<VerifyOtpResult>;
  resend?(request: ResendOtpRequest): Promise<ResendOtpResult>;
}
```

**`IssueOtpRequest`** — should contain enough information for any provider:

```typescript
{
  uid,
  authId,
  identifier,
  identifierType,
  purpose,
  expiresIn
}
```

**`IssueOtpResult`** — must support both internal and external providers.

For database providers:

```typescript
{
  handledDelivery: false,
  code: "483921",
  expiresAt: Date
}
```

For Twilio Verify:

```typescript
{
  handledDelivery: true,
  verificationId: "...",
  expiresAt: Date | undefined
}
```

> **Note:** External providers will not return the OTP.

**`VerifyOtpResult`** — should be provider-independent:

```typescript
{
  success: true,
  metadata?: {}
}
```

### 2. `AuthNotificationProvider` (existing — to be improved)

Keep the notification provider, but enrich its signature.

**Current:**

```typescript
sendVerificationCode(to, code, type)
```

**Replace with:**

```typescript
sendVerificationCode({
  to,
  code,
  type,
  purpose,
  expiresAt
})
```

This lets applications customize messages based on purpose (email verification, phone verification, password reset, login verification, etc.)

> The notification provider should **never** know where the OTP came from.

---

## Default OTP Provider

Create a built-in provider named `DatabaseOtpProvider`.

Move all current logic from:

- `sendVerification()`
- `forgotPassword()`
- `resetPassword()`
- `verifyCode()`
- `resendVerification()`

...into this provider. It must preserve current behavior exactly:

- Generate OTP
- Hash OTP
- Store hash
- Handle expiration
- Resend logic
- Verification logic

**Nothing should change functionally.**

---

## Twilio Verify Support

Design the architecture so that implementing `TwilioVerifyOtpProvider` requires **no changes to `AuthService`**.

**`issue()` flow:**

```
issue()
  → Call Twilio Verify
  → Twilio generates OTP
  → Twilio stores OTP
  → Twilio sends SMS
  → Return { handledDelivery: true, verificationId }
```

**`verify()` flow:**

```
verify()
  → Call Twilio Verify Check
  → Return success
```

> Twilio Verify never exposes the OTP — the library must support this.

---

## `AuthService` Changes

Replace all direct OTP generation with `otpProvider.issue(...)`.

**Before:**

```
generate OTP → hash → save → notificationProvider.send(...)
```

**After:**

```typescript
const result = await otpProvider.issue(...);

if (!result.handledDelivery) {
  await notificationProvider.sendVerificationCode(...);
}
```

The authentication flow should **not** know whether the OTP came from the database, Twilio, Firebase, or a custom provider.

Replace every direct OTP verification with:

```typescript
await otpProvider.verify(...);
```

`AuthService` should **never** call `bcrypt.compare()` directly anymore — that logic belongs inside `DatabaseOtpProvider`.

---

## Existing Features (must keep working, no breaking changes)

- Signup verification
- Login verification
- Resend verification
- Forgot password
- Password reset
- Secure account
- Magic link
- MFA
- Passwordless authentication

---

## OTP Purposes

Continue using the existing enum:

- `VERIFY_EMAIL`
- `VERIFY_PHONE`
- `PASSWORD_RESET`
- `MAGIC_LINK`
- `SECURE_ACCOUNT`

Providers should receive the purpose.

---

## Dependency Injection

Introduce `AUTH_OTP_PROVIDER`, similar to `AUTH_NOTIFICATION_PROVIDER`.

If no provider is registered, automatically register `DatabaseOtpProvider` so existing users do not need to change anything.

---

## Backward Compatibility

This refactor must **not** break existing applications.

- Applications that already implement `AuthNotificationProvider` should continue working exactly as before.
- Only developers who wish to use Twilio Verify or another external OTP provider need to implement `AuthOtpProvider`.

---

## Code Quality Requirements

- Follow SOLID principles.
- Separate orchestration from provider implementations.
- Avoid duplicating OTP logic between `AuthService` and providers.
- Keep `AuthService` focused on authentication workflows, not OTP implementation details.
- Use dependency injection throughout.
- Ensure each provider is independently unit testable.
- Preserve all current tests and behavior where possible.
- Keep public authentication endpoints unchanged — only the internal OTP architecture should be refactored.