import { BaseEntity } from './base.entity';
export declare enum OtpPurpose {
    VERIFY_EMAIL = "VERIFY_EMAIL",// For registration
    VERIFY_PHONE = "VERIFY_PHONE",// For registration
    PASSWORD_RESET = "PASSWORD_RESET",// For recovery
    LOGIN_2FA = "LOGIN_2FA"
}
export declare class OtpToken extends BaseEntity {
    identifier: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    isUsed: boolean;
    requestUserId?: string;
    /**
     * The ID of the primary Auth record that triggered this verification.
     * This is used to mark the specific Auth method as verified upon success.
     */
    requestAuthId?: string;
}
