import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { Auth } from '../entities/auth.entity';
export declare class OtpAuthStrategy {
    registerCredentials(dto: SignupDto, uid?: string): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}
