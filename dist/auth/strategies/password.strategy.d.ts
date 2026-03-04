import { DataSource, Repository } from 'typeorm';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';
import { AuthUserService } from '../interfaces/auth-user-service.interface';
export declare class PasswordAuthStrategy {
    private readonly dataSource;
    private authRepo;
    private identifierRepo;
    private readonly userService;
    constructor(dataSource: DataSource, authRepo: Repository<Auth>, identifierRepo: Repository<AuthIdentifier>, userService: AuthUserService);
    private readonly logger;
    signup(dto: SignupDto): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}
