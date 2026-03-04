import { Auth } from './auth.entity';
export declare enum IdentifierType {
    EMAIL = "EMAIL",
    PHONE = "PHONE",
    USERNAME = "USERNAME"
}
export declare class AuthIdentifier {
    id: string;
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
