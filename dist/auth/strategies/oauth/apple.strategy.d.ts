import { LoginDto } from '../../dto/requests/login.dto';
import { SignupDto } from '../../dto/requests/signup.dto';
import { Auth, AuthIdentifier } from '../../interfaces/models.interface';
import { AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { AuthRepository, AuthIdentifierRepository, OAuthProviderRepository } from '../../interfaces/repositories.interface';
export declare class AppleAuthStrategy implements IOAuthStrategy {
    private authRepo;
    private identifierRepo;
    private oauthProviderRepo;
    private options;
    private applePublicKeys;
    private lastKeysFetch;
    constructor(authRepo: AuthRepository, identifierRepo: AuthIdentifierRepository, oauthProviderRepo: OAuthProviderRepository, options: AuthModuleOptions);
    private getApplePublicKeys;
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
