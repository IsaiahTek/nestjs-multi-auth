import { AuthStrategy } from '../auth-type.enum';
export declare class LoginDto {
    method: AuthStrategy;
    emailOrPhone?: string;
    password?: string;
    token?: string;
}
