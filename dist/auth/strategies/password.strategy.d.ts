import { DataSource, Repository } from 'typeorm';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';
export declare class PasswordAuthStrategy {
    private readonly dataSource;
    private authRepo;
    private identifierRepo;
    constructor(dataSource: DataSource, authRepo: Repository<Auth>, identifierRepo: Repository<AuthIdentifier>);
    private readonly logger;
    registerCredentials(dto: SignupDto, uid?: string): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}
