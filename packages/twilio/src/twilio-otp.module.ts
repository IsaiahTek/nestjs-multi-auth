import { DynamicModule, Module } from '@nestjs/common';
import { TwilioOtpAdapter } from './twilio-otp.adapter';

export const TWILIO_OTP_OPTIONS = 'TWILIO_OTP_OPTIONS';

export interface TwilioOtpModuleOptions {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

@Module({})
export class TwilioOtpModule {
  static register(options: TwilioOtpModuleOptions): DynamicModule {
    return {
      module: TwilioOtpModule,
      providers: [
        {
          provide: TWILIO_OTP_OPTIONS,
          useValue: options,
        },
        TwilioOtpAdapter,
      ],
      exports: [TwilioOtpAdapter, TWILIO_OTP_OPTIONS],
    };
  }
}
