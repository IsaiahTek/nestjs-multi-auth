import { OtpPurpose } from '../enums/otp-purpose.enum';

export interface IssueOtpRequest {
  uid: string;
  authId: string;
  identifier: string;
  identifierType: 'email' | 'phone';
  purpose: OtpPurpose;
  expiresIn?: number; // In minutes
}

export interface IssueOtpResult {
  handledDelivery: boolean;
  code?: string;
  verificationId?: string;
  expiresAt?: Date;
}

export interface VerifyOtpRequest {
  uid: string;
  code: string;
  purpose?: OtpPurpose;
}

export interface VerifyOtpResult {
  success: boolean;
  metadata?: Record<string, any>;
  authId?: string; // The ID of the Auth method this OTP was created for
}

export interface ResendOtpRequest {
  uid: string;
  purpose?: OtpPurpose;
}

export interface ResendOtpResult {
  handledDelivery: boolean;
  code?: string;
  verificationId?: string;
  expiresAt?: Date;
  metadata?: {
    identifier: string;
    identifierType: 'email' | 'phone';
    purpose: string;
  };
}

export const AUTH_OTP_PROVIDER = 'AUTH_OTP_PROVIDER';
export const AUTH_OTP_PROVIDER_EMAIL = 'AUTH_OTP_PROVIDER_EMAIL';
export const AUTH_OTP_PROVIDER_PHONE = 'AUTH_OTP_PROVIDER_PHONE';

export interface AuthOtpProvider {
  issue(request: IssueOtpRequest): Promise<IssueOtpResult>;
  verify(request: VerifyOtpRequest): Promise<VerifyOtpResult>;
  resend?(request: ResendOtpRequest): Promise<ResendOtpResult>;
}

/**
 * Granular per-channel OTP provider map.
 * Use this instead of (or alongside) the top-level `otpProvider` option
 * when different identifier types should use different OTP backends.
 *
 * Any channel left undefined falls back to the top-level `otpProvider`,
 * which itself defaults to `DatabaseOtpProvider`.
 */
export interface OtpProviderMap {
  email?: any; // Type<AuthOtpProvider>
  phone?: any; // Type<AuthOtpProvider>
}
