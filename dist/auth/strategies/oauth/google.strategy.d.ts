import { DataSource, Repository } from 'typeorm';
import { LoginDto } from '../../dto/login.dto';
import { SignupDto } from '../../dto/signup.dto';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier } from '../../entities/auth-identify.entity';
import { AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from './oauth-strategy.interface';
export declare class GoogleAuthStrategy implements IOAuthStrategy {
    private readonly dataSource;
    private authRepo;
    private oauthProviderRepo;
    private options;
    private client;
    constructor(dataSource: DataSource, authRepo: Repository<Auth>, oauthProviderRepo: Repository<OAuthProvider>, options: AuthModuleOptions);
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
