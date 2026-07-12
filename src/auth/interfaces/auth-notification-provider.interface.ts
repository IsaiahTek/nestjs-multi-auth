export const AUTH_NOTIFICATION_PROVIDER = 'AUTH_NOTIFICATION_PROVIDER';

export interface AuthNotificationProvider {
    /**
     * Sends a verification code to a specific destination (email or phone).
     * 
     * @param to The destination identifier (email or phone number)
     * @param code The numeric or alphanumeric verification code
     * @param type The type of identifier ('email' | 'phone')
     */
    sendVerificationCode(request: {
        to: string;
        code: string;
        type: 'email' | 'phone';
        purpose?: string;
        expiresAt?: Date;
    }): Promise<void>;

    /**
     * Sends a notification when a password is changed, including security context.
     * 
     * @param to The destination identifier (email or phone number)
     * @param context The security context
     */
    sendPasswordChangedNotification?(to: string, context: {
        ip: string;
        userAgent: string;
        secureAccountLink: string;
    }): Promise<void>;

    /**
     * Sends a magic login link.
     * 
     * @param to The destination identifier (email or phone number)
     * @param link The magic link
     */
    sendMagicLink?(to: string, link: string): Promise<void>;
}
