export const AUTH_NOTIFICATION_PROVIDER = 'AUTH_NOTIFICATION_PROVIDER';

export interface AuthNotificationProvider {
    /**
     * Sends a verification code to a specific destination (email or phone).
     * 
     * @param to The destination identifier (email or phone number)
     * @param code The numeric or alphanumeric verification code
     * @param type The type of identifier ('email' | 'phone')
     */
    sendVerificationCode(to: string, code: string, type: 'email' | 'phone'): Promise<void>;
}
