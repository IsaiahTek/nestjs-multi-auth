export declare enum MfaType {
    TOTP = "TOTP",
    SMS = "SMS",
    EMAIL = "EMAIL"
}
export declare class MfaMethod {
    id: string;
    userId: string;
    type: MfaType;
    secret: string;
    isEnabled: boolean;
    isDefault: boolean;
    lastUsedAt: Date;
    createdAt: Date;
    toMap(): {
        id: string;
        type: MfaType;
        isEnabled: boolean;
        isDefault: boolean;
        lastUsedAt: Date;
        createdAt: Date;
    };
}
