import { Auth } from './auth.entity';
import { BaseEntity } from './base.entity';
export declare enum IdentifierType {
    EMAIL = "EMAIL",
    PHONE = "PHONE",
    USERNAME = "USERNAME"
}
export declare class AuthIdentifier extends BaseEntity {
    auth: Auth;
    type: IdentifierType;
    value: string;
    isVerified: boolean;
    toMap(): {
        id: string;
        type: IdentifierType;
        value: string;
        isVerified: boolean;
    };
}
