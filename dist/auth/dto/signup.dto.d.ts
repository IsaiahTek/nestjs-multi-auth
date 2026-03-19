import { AuthStrategy, OAuthProviderType } from '../enums/auth-type.enum';
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
}
