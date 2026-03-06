import { AuthStrategy, OAuthProviderType } from '../auth-type.enum';
export declare class SignupDto {
    method: AuthStrategy;
    provider?: OAuthProviderType;
    phone?: string;
    username?: string;
    email?: string;
    password?: string;
    token?: string;
}
