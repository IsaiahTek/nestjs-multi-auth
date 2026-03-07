import { LoginDto } from '../../dto/login.dto';
import { SignupDto } from '../../dto/signup.dto';
import { Auth } from '../../entities/auth.entity';
import { AuthIdentifier } from '../../entities/auth-identify.entity';
import { IOAuthStrategy } from './oauth-strategy.interface';
export declare class AppleAuthStrategy implements IOAuthStrategy {
    registerCredentials(dto: SignupDto, uid?: string): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
    login(dto: LoginDto): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
}
