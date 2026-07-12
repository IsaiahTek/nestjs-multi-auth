import { Repository } from 'typeorm';
import { AuthRepository } from '../../../auth/interfaces/repositories.interface';
import { Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
import { Auth } from '../entities/auth.entity';
import { AuthStrategy } from '../../../auth/enums/auth-type.enum';
export declare class TypeOrmAuthRepository implements AuthRepository {
    private readonly repo;
    constructor(repo: Repository<Auth>);
    create(data: Partial<CoreAuth>): Promise<CoreAuth>;
    findById(id: string): Promise<CoreAuth | null>;
    findByUid(uid: string): Promise<CoreAuth | null>;
    findByUidAndStrategy(uid: string, strategy: AuthStrategy): Promise<CoreAuth | null>;
    findByUidAndStrategies(uid: string, strategies: AuthStrategy[]): Promise<CoreAuth | null>;
    findAllByUid(uid: string): Promise<CoreAuth[]>;
    findAll(): Promise<CoreAuth[]>;
    save(auth: CoreAuth): Promise<CoreAuth>;
    update(id: string, data: Partial<CoreAuth>): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByUid(uid: string): Promise<void>;
    findWithIdentifiers(id: string): Promise<CoreAuth | null>;
}
