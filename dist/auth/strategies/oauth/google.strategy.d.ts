import { Auth, AuthIdentifier } from '../../interfaces/models.interface';
import { AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { LoginDto } from '../../dto/requests/login.dto';
import { SignupDto } from '../../dto/requests/signup.dto';
import { AuthRepository, AuthIdentifierRepository, OAuthProviderRepository } from '../../interfaces/repositories.interface';
export declare class GoogleAuthStrategy implements IOAuthStrategy {
    private authRepo;
    private identifierRepo;
    private oauthProviderRepo;
    private options;
    private client;
    constructor(authRepo: AuthRepository, identifierRepo: AuthIdentifierRepository, oauthProviderRepo: OAuthProviderRepository, options: AuthModuleOptions);
    private verifyToken;
    registerCredentials(dto: SignupDto, uid?: string): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
    login(dto: LoginDto): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
}
