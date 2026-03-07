import { DataSource, Repository } from 'typeorm';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';
export declare class LocalAuthStrategy {
    private readonly dataSource;
    private authRepo;
    private identifierRepo;
    private options;
    constructor(dataSource: DataSource, authRepo: Repository<Auth>, identifierRepo: Repository<AuthIdentifier>, options: AuthModuleOptions);
    private readonly logger;
    registerCredentials(dto: SignupDto, uid?: string): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
    login(dto: LoginDto): Promise<{
        auth: Auth;
        identifier?: AuthIdentifier;
    }>;
}
