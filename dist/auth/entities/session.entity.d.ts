export declare class Session {
    id: string;
    uid: string;
    namespace: string;
    refreshTokenHash: string;
    userAgent: string;
    deviceFingerprint: string;
    ipAddress: string;
    expiresAt: Date;
    createdAt: Date;
    toMap(): {
        id: string;
        uid: string;
        userAgent: string;
        deviceFingerprint: string;
        ipAddress: string;
        expiresAt: Date;
        createdAt: Date;
        namespace: string;
    };
}
