import { AuthOtpProvider, IssueOtpRequest, IssueOtpResult, VerifyOtpRequest, VerifyOtpResult, ResendOtpRequest, ResendOtpResult } from '../interfaces/auth-otp-provider.interface';
import { OtpTokenRepository } from '../interfaces/repositories.interface';
import { AuthModuleOptions } from '../interfaces/auth-module-options.interface';
export declare class DatabaseOtpProvider implements AuthOtpProvider {
    private readonly otpRepo;
    private readonly options;
    private readonly logger;
    constructor(otpRepo: OtpTokenRepository, options: AuthModuleOptions);
    issue(request: IssueOtpRequest): Promise<IssueOtpResult>;
    verify(request: VerifyOtpRequest): Promise<VerifyOtpResult>;
    resend(request: ResendOtpRequest): Promise<ResendOtpResult>;
}
