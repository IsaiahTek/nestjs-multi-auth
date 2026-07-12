import { Auth } from './auth.entity';
import { BaseEntity } from './base.entity';
import { IdentifierType, IdentifierSource } from '../../../auth/enums/identifier-type.enum';
export declare class AuthIdentifier extends BaseEntity {
    auth: Auth;
    type: IdentifierType;
    value: string;
    isVerified: boolean;
    /**
     * Who issued this identifier
     */
    source: IdentifierSource;
    /**
     * Optional: how it was verified
     */
    verifiedBy?: 'OTP' | 'PROVIDER' | 'ADMIN';
    toMap(): {
        id: string;
        type: IdentifierType;
        value: string;
        isVerified: boolean;
    };
}
