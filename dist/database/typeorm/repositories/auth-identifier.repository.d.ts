import { Repository } from 'typeorm';
import { AuthIdentifierRepository } from '../../../auth/interfaces/repositories.interface';
import { AuthIdentifier as CoreAuthIdentifier, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
import { AuthIdentifier } from '../entities/auth-identify.entity';
export declare class TypeOrmAuthIdentifierRepository implements AuthIdentifierRepository {
    private readonly repo;
    constructor(repo: Repository<AuthIdentifier>);
    create(data: Partial<CoreAuthIdentifier>): Promise<CoreAuthIdentifier>;
    findByValue(value: string): Promise<CoreAuthIdentifier | null>;
    findByAuthId(authId: string): Promise<CoreAuthIdentifier[]>;
    findByUidAndTypes(uid: string, types: string[]): Promise<CoreAuthIdentifier | null>;
    findWithAuthByValue(value: string): Promise<{
        identifier: CoreAuthIdentifier;
        auth: CoreAuth;
    } | null>;
    save(identifier: CoreAuthIdentifier): Promise<CoreAuthIdentifier>;
    markVerifiedByAuthId(authId: string): Promise<void>;
}
