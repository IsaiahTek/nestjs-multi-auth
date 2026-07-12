import { SessionEvent } from '../../../auth/enums/session-event.enum';
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
