import { Repository } from 'typeorm';
import { MfaMethodRepository } from '../../../auth/interfaces/repositories.interface';
import { MfaMethod as CoreMfaMethod } from '../../../auth/interfaces/models.interface';
import { MfaMethod } from '../entities/mfa-method.entity';
export declare class TypeOrmMfaMethodRepository implements MfaMethodRepository {
    private readonly repo;
    constructor(repo: Repository<MfaMethod>);
    create(data: Partial<CoreMfaMethod>): Promise<CoreMfaMethod>;
    findByUidAndEnabled(uid: string): Promise<CoreMfaMethod | null>;
    findByUidAndType(uid: string, type: any): Promise<CoreMfaMethod | null>;
    save(method: CoreMfaMethod): Promise<CoreMfaMethod>;
    deleteByUid(uid: string): Promise<void>;
}
