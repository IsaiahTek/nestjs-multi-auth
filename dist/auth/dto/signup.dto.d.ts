import { AuthStrategy, OAuthProviderType } from '../auth-type.enum';
export declare class SignupDto {
    method: AuthStrategy;
    provider?: OAuthProviderType;
    phone?: string;
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    bio?: string;
    companyName?: string;
    registrationNo?: string;
    token?: string;
}
