import { BaseEntity } from './base.entity';
export declare enum OtpPurpose {
    VERIFY_EMAIL = "VERIFY_EMAIL",
    VERIFY_PHONE = "VERIFY_PHONE",
    PASSWORD_RESET = "PASSWORD_RESET",
    LOGIN_2FA = "LOGIN_2FA"
}
export declare class OtpToken extends BaseEntity {
    identifier: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    isUsed: boolean;
    requestUserId?: string;
}
