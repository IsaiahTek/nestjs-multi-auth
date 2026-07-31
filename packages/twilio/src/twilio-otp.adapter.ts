import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import {
  AuthOtpProvider,
  IssueOtpRequest,
  IssueOtpResult,
  VerifyOtpRequest,
  VerifyOtpResult,
  ResendOtpRequest,
  ResendOtpResult,
  OtpTokenRepository,
  OTP_TOKEN_REPOSITORY_TOKEN,
  OtpToken
} from '@vynelix/nestjs-multi-auth';
import { Twilio } from 'twilio';
import { TWILIO_OTP_OPTIONS, TwilioOtpModuleOptions } from './twilio-otp.module';

@Injectable()
export class TwilioOtpAdapter implements AuthOtpProvider {
  private readonly logger = new Logger(TwilioOtpAdapter.name);
  private readonly twilioClient: Twilio;

  constructor(
    @Inject(TWILIO_OTP_OPTIONS)
    private readonly options: TwilioOtpModuleOptions,
    @Inject(OTP_TOKEN_REPOSITORY_TOKEN)
    private readonly otpRepo: OtpTokenRepository,
  ) {
    this.twilioClient = new Twilio(this.options.accountSid, this.options.authToken);
  }

  async issue(request: IssueOtpRequest): Promise<IssueOtpResult> {
    try {
      const channel = request.identifierType === 'email' ? 'email' : 'sms';

      const verification = await this.twilioClient.verify.v2
        .services(this.options.serviceSid)
        .verifications.create({
          to: request.identifier,
          channel,
        });

      // We still need to save the request in the local DB so that
      // we can retrieve the identifier during verification.
      const expiresAt = new Date();
      const otpExpMins = request.expiresIn || 10; // Default Twilio expiry is typically 10 mins
      expiresAt.setMinutes(expiresAt.getMinutes() + otpExpMins);

      await this.otpRepo.create({
        identifier: request.identifier,
        purpose: request.purpose,
        codeHash: `twilio:${verification.sid}`, // Store the SID as a dummy hash
        expiresAt,
        requestUserId: request.uid,
        requestAuthId: request.authId,
      });

      return {
        handledDelivery: true,
        verificationId: verification.sid,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to issue Twilio OTP: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send verification code');
    }
  }

  async verify(request: VerifyOtpRequest): Promise<VerifyOtpResult> {
    let otp: OtpToken;
    if (request.purpose) {
      otp = await this.otpRepo.findLatestUnusedByPurpose(request.uid, request.purpose);
    } else {
      otp = await this.otpRepo.findLatestUnused(request.uid);
    }

    if (!otp) {
      throw new BadRequestException('No verification request found');
    }

    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Verification code expired');
    }

    try {
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.options.serviceSid)
        .verificationChecks.create({
          to: otp.identifier,
          code: request.code,
        });

      if (verificationCheck.status !== 'approved') {
        throw new BadRequestException('Invalid verification code');
      }

      // Mark as used in our DB
      otp.isUsed = true;
      await this.otpRepo.save(otp);

      return {
        success: true,
        authId: otp.requestAuthId,
        metadata: {
          identifier: otp.identifier,
          purpose: otp.purpose,
          twilioSid: verificationCheck.sid
        }
      };
    } catch (error) {
      this.logger.error(`Failed to verify Twilio OTP: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid verification code');
    }
  }

  async resend(request: ResendOtpRequest): Promise<ResendOtpResult> {
    let latestOtp: OtpToken;
    if (request.purpose) {
      latestOtp = await this.otpRepo.findLatestUnusedByPurpose(request.uid, request.purpose);
    } else {
      latestOtp = await this.otpRepo.findLatestUnused(request.uid);
    }

    if (!latestOtp) {
      throw new BadRequestException('No previous verification code found to resend.');
    }

    // Call issue again with the previous details
    return this.issue({
      uid: request.uid,
      authId: latestOtp.requestAuthId!,
      identifier: latestOtp.identifier,
      identifierType: latestOtp.identifier.includes('@') ? 'email' : 'phone',
      purpose: latestOtp.purpose,
    });
  }
}
