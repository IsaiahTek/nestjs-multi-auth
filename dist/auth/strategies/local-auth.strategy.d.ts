import { LoginDto } from '../dto/requests/login.dto';
import { SignupDto } from '../dto/requests/signup.dto';
import { AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { AuthRepository, AuthIdentifierRepository } from '../interfaces/repositories.interface';
import { Auth, AuthIdentifier } from '../interfaces/models.interface';
export declare class LocalAuthStrategy {
    private authRepo;
    private identifierRepo;
    private options;
    constructor(authRepo: AuthRepository, identifierRepo: AuthIdentifierRepository, options: AuthModuleOptions);
    private readonly logger;
    private validatePhoneFormat;
    private requiresPassword;
    registerCredentials(dto: SignupDto, uid?: string): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
    login(dto: LoginDto): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
}
