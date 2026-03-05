export declare const AUTH_NOTIFICATION_PROVIDER = "AUTH_NOTIFICATION_PROVIDER";
export interface AuthNotificationProvider {
    sendVerificationCode(to: string, code: string, type: 'email' | 'phone'): Promise<void>;
}
