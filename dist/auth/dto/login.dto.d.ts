import { AuthStrategy } from '../auth-type.enum';
export declare class LoginDto {
    method: AuthStrategy;
    emailOrPhone?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    token?: string;
}
