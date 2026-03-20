import { SignupDto } from '../dto/requests/signup.dto';
import { LoginDto } from '../dto/requests/login.dto';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';

export interface IOAuthStrategy {
    registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }>;
    login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }>;
}
