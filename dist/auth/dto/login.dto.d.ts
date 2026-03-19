import { AuthStrategy, OAuthProviderType } from '../enums/auth-type.enum';
export declare class LoginDto {
    method: AuthStrategy;
    provider?: OAuthProviderType;
    emailOrPhone?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    token?: string;
}
