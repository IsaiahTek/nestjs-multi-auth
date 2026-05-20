import { AuthStrategy, OAuthProviderType } from '../../enums/auth-type.enum';
export declare class SignupDto {
    method: AuthStrategy;
    provider?: OAuthProviderType;
    phone?: string;
    username?: string;
    email?: string;
    password?: string;
    /**
     * For OAuth / OTP verification
     */
    token?: string;
    /**
     * Extra data to be returned along the signup event payload.
     * This is useful for passing additional information about the user
     * that may be needed for other purposes.
     */
    extraData?: Record<string, unknown>;
}
