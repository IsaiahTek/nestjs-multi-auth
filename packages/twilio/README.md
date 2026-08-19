# @vynelix/nestjs-multi-auth-twilio

The official [Twilio Verify](https://www.twilio.com/docs/verify) OTP adapter for `@vynelix/nestjs-multi-auth`. 

This adapter allows you to completely replace the default local/database OTP provider with Twilio's highly reliable SMS and Email verification network. By using this adapter, Twilio will handle the generation, delivery, and validation of all OTP codes.

## Installation

You can install this adapter alongside the core package:

```bash
npm install @vynelix/nestjs-multi-auth @vynelix/nestjs-multi-auth-twilio twilio
```

## Setup & Usage

To use Twilio for your OTPs, you need to register the `TwilioOtpModule` in your application and then map its adapter into the core `AuthModule`.

### 1. Register the Modules

In your `app.module.ts` (or your authentication module), import and configure both modules:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@vynelix/nestjs-multi-auth';
import { TwilioOtpModule, TwilioOtpAdapter } from '@vynelix/nestjs-multi-auth-twilio';

@Module({
  imports: [
    // 1. Initialize the Twilio Module with your credentials
    TwilioOtpModule.register({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID, // The SID of your Twilio Verify Service
      // Option A: Using Auth Token
      authToken: process.env.TWILIO_AUTH_TOKEN,
      // Option B: Using API Key & Secret
      // apiKey: process.env.TWILIO_API_KEY,
      // apiSecret: process.env.TWILIO_API_SECRET,
    }),

    // 2. Configure the core AuthModule to use the Twilio adapter
    AuthModule.forRootAsync({
      // Ensure the Twilio module is available to the AuthModule
      imports: [TwilioOtpModule],
      useFactory: () => ({
        // You can set Twilio as the global OTP provider by passing the class reference:
        otpProvider: TwilioOtpAdapter,
        
        // OR you can be granular and only use it for phone numbers:
        // otpProviders: {
        //   phone: TwilioOtpAdapter,
        //   email: DatabaseOtpProvider
        // }
      }),
    }),
  ],
})
export class AppModule {}
```

## How it works

When a user requests an OTP (e.g., during login or signup), the core `@vynelix/nestjs-multi-auth` service will delegate the request to the `TwilioOtpAdapter`.

1. **Issue:** The adapter calls Twilio's `verifications.create` endpoint to send the OTP via SMS or Email. It stores the resulting `verificationSid` securely in your local database using the core `OtpTokenRepository`.
2. **Verify:** When the user submits the code, the adapter looks up the local record to find the user's identifier, and calls Twilio's `verificationChecks.create` endpoint to validate the code.

Because Twilio generates the codes themselves, the `codeHash` in your local database is completely ignored. Twilio maintains the true state of the code.
