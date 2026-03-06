import { SignupDto } from '../../dto/signup.dto';
import { LoginDto } from '../../dto/login.dto';
import { Auth } from '../../entities/auth.entity';
export interface IOAuthStrategy {
    registerCredentials(dto: SignupDto, uid?: string): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}
