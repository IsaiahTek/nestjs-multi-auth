import { LoginDto } from '../../dto/login.dto';
import { SignupDto } from '../../dto/signup.dto';
import { Auth } from '../../entities/auth.entity';
import { IOAuthStrategy } from './oauth-strategy.interface';
export declare class AppleAuthStrategy implements IOAuthStrategy {
    registerCredentials(dto: SignupDto, uid?: string): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}
