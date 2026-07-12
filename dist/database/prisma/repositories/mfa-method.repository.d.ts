import { MfaMethodRepository } from '../../../auth/interfaces/repositories.interface';
import { MfaMethod as CoreMfaMethod } from '../../../auth/interfaces/models.interface';
export declare class PrismaMfaMethodRepository implements MfaMethodRepository {
    private readonly prisma;
    constructor(prisma: any);
    create(data: Partial<CoreMfaMethod>): Promise<CoreMfaMethod>;
    findByUidAndType(uid: string, type: string): Promise<CoreMfaMethod | null>;
    findByUidAndEnabled(uid: string): Promise<CoreMfaMethod | null>;
    save(method: CoreMfaMethod): Promise<CoreMfaMethod>;
    deleteByUid(uid: string): Promise<void>;
}
