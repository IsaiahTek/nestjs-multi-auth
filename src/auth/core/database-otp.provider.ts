import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  AuthOtpProvider,
  IssueOtpRequest,
  IssueOtpResult,
  VerifyOtpRequest,
  VerifyOtpResult,
  ResendOtpRequest,
  ResendOtpResult
} from '../interfaces/auth-otp-provider.interface';
import { OtpTokenRepository } from '../interfaces/repositories.interface';
import { OTP_TOKEN_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { OtpToken } from '../interfaces/models.interface';

@Injectable()
export class DatabaseOtpProvider implements AuthOtpProvider {
  private readonly logger = new Logger(DatabaseOtpProvider.name);

  constructor(
    @Inject(OTP_TOKEN_REPOSITORY_TOKEN)
    private readonly otpRepo: OtpTokenRepository,
    @Inject(AUTH_MODULE_OPTIONS)
    private readonly options: AuthModuleOptions,
  ) { }

  async issue(request: IssueOtpRequest): Promise<IssueOtpResult> {
    let code: string;
    let handledDelivery = false;

    const testAccount = this.options.testAccounts?.find(ta => ta.identifier === request.identifier);

    if (testAccount) {
      code = testAccount.otp;
      handledDelivery = true; // Skip sending notification
    } else if (this.options.debugMode && this.options.defaultOtp) {
      code = this.options.defaultOtp;
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const hash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    const otpExpMins = request.expiresIn || this.options.otpExpiresIn || 15;
    expiresAt.setMinutes(expiresAt.getMinutes() + otpExpMins);

    await this.otpRepo.create({
      identifier: request.identifier,
      purpose: request.purpose,
      codeHash: hash,
      expiresAt,
      requestUserId: request.uid,
      requestAuthId: request.authId,
    });

    return {
      handledDelivery,
      code,
      expiresAt,
    };
  }

  async verify(request: VerifyOtpRequest): Promise<VerifyOtpResult> {
    let otp: OtpToken;
    if (request.purpose) {
      otp = await this.otpRepo.findLatestUnusedByPurpose(request.uid, request.purpose);
    } else {
      otp = await this.otpRepo.findLatestUnused(request.uid);
    }

    if (!otp) {
      throw new BadRequestException('No verification code found');
    }

    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Verification code expired');
    }

    const isMatch = await bcrypt.compare(request.code, otp.codeHash);
    if (!isMatch) {
      throw new BadRequestException('Invalid verification code');
    }

    otp.isUsed = true;
    await this.otpRepo.save(otp);

    return {
      success: true,
      authId: otp.requestAuthId,
      metadata: {
        identifier: otp.identifier,
        purpose: otp.purpose,
      }
    };
  }

  async resend(request: ResendOtpRequest): Promise<ResendOtpResult> {
    let latestOtp: OtpToken;
    if (request.purpose) {
      latestOtp = await this.otpRepo.findLatestUnusedByPurpose(request.uid, request.purpose);
    } else {
      latestOtp = await this.otpRepo.findLatestUnused(request.uid);
    }

    if (latestOtp) {
      const intervalSeconds = this.options.otpResendInterval || 60;
      const diffMs = Date.now() - latestOtp.createdAt.getTime();
      if (diffMs < intervalSeconds * 1000) {
        const wait = Math.ceil(intervalSeconds - (diffMs / 1000));
        throw new BadRequestException(`Please wait ${wait} seconds before requesting a new code.`);
      }

      // We issue a new OTP for the same identifier and purpose
      return this.issue({
        uid: request.uid,
        authId: latestOtp.requestAuthId!,
        identifier: latestOtp.identifier,
        identifierType: latestOtp.identifier.includes('@') ? 'email' : 'phone', // rough heuristic, ideally should come from request
        purpose: latestOtp.purpose,
      });
    }

    throw new BadRequestException('No previous verification code found to resend.');
  }
}
