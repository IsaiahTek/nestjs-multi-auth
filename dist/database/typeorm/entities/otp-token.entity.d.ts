import { BaseEntity } from './base.entity';
import { OtpPurpose } from '../../../auth/enums/otp-purpose.enum';
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
