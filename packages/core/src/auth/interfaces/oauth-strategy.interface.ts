import { SignupDto } from '../dto/requests/signup.dto';
import { LoginDto } from '../dto/requests/login.dto';
import { Auth } from '../interfaces/models.interface';
import { AuthIdentifier } from '../interfaces/models.interface';

export interface IOAuthStrategy {
    registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }>;
    login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }>;
}
