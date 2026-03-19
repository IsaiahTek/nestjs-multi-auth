import { Auth } from './auth.entity';
import { BaseEntity } from './base.entity';
export declare enum IdentifierType {
    EMAIL = "EMAIL",
    PHONE = "PHONE",
    USERNAME = "USERNAME"
}
export declare enum IdentifierSource {
    APPLE = "APPLE",
    FACEBOOK = "FACEBOOK",
    GOOGLE = "GOOGLE",
    LOCAL = "LOCAL"
}
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
