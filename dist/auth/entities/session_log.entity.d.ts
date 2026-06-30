export declare enum SessionEvent {
    LOGIN = 0,
    LOGOUT = 1,
    REVOKE = 2,
    EXPIRE = 3,
    DELETE = 4
}
export declare class SessionLog {
    id: string;
    sessionId: string;
    uid: string;
    namespace: string;
    event: SessionEvent;
    userAgent: string;
    deviceFingerprint: string;
    ipAddress: string;
    timestamp: Date;
    reason?: string;
    toMap(): {
        id: string;
        uid: string;
        sessionId: string;
        event: SessionEvent;
        userAgent: string;
        deviceFingerprint: string;
        ipAddress: string;
        timestamp: Date;
        reason: string;
        namespace: string;
    };
}
