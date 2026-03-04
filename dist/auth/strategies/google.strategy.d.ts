import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { Auth } from '../entities/auth.entity';
export declare class GoogleAuthStrategy {
    signup(dto: SignupDto): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}
