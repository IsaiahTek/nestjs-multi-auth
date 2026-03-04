import { AuthStrategy } from '../auth-type.enum';
export declare class SignupDto {
    method: AuthStrategy;
    phone?: string;
    email?: string;
    password?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    bio?: string;
    companyName?: string;
    registrationNo?: string;
}
