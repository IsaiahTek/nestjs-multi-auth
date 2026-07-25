export declare enum AuthEvents {
    /**
     * Emitted when a user signs up.
     * Payload: { auth: AuthDto, identifier: AuthIdentifierDto }
     */
    SIGNUP = "auth.signup",
    /**
     * Emitted when a user logs in successfully.
     * Payload: { auth: AuthDto, tokens: TokensDto }
     */
    LOGIN = "auth.login",
    /**
     * Emitted when a user logs out.
     * Payload: { uid: string }
     */
    LOGOUT = "auth.logout",
    /**
     * Emitted when tokens are successfully refreshed.
     * Payload: { uid: string, tokens: TokensDto }
     */
    TOKEN_REFRESHED = "auth.token_refreshed",
    /**
     * Emitted after a successful password reset via OTP.
     * Payload: { auth: AuthDto }
     */
    PASSWORD_RESET = "auth.password_reset",
    /**
     * Emitted after a user manually updates their password.
     * Payload: { auth: AuthDto }
     */
    PASSWORD_UPDATED = "auth.password_updated",
    /**
     * Emitted when a user's identity (email/phone) is verified.
     * Payload: { auth: AuthDto }
     */
    IDENTITY_VERIFIED = "auth.identity_verified",
    /**
     * Emitted when a user enrolls in MFA (before activation).
     * Payload: { uid: string, type: string }
     */
    MFA_ENROLLED = "auth.mfa_enrolled",
    /**
     * Emitted when MFA is successfully activated.
     * Payload: { uid: string, type: string }
     */
    MFA_ACTIVATED = "auth.mfa_activated",
    /**
     * Emitted when MFA is successfully deactivated.
     * Payload: { uid: string, type: string }
     */
    MFA_DEACTIVATED = "auth.mfa_deactivated",
    /**
     * Emitted when a magic link is requested.
     * Payload: { email: string }
     */
    MAGIC_LINK_REQUESTED = "auth.magic_link_requested",
    /**
     * Emitted when an account is locked/secured due to suspicious activity.
     * Payload: { uid: string }
     */
    ACCOUNT_SECURED = "auth.account_secured"
}
