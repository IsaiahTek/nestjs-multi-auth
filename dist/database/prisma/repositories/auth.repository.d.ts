import { AuthRepository } from '../../../auth/interfaces/repositories.interface';
import { Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
import { AuthStrategy } from '../../../auth/enums/auth-type.enum';
export declare class PrismaAuthRepository implements AuthRepository {
    private readonly prisma;
    constructor(prisma: any);
    create(data: Partial<CoreAuth>): Promise<CoreAuth>;
    findById(id: string): Promise<CoreAuth | null>;
    findByUid(uid: string): Promise<CoreAuth | null>;
    findAllByUid(uid: string): Promise<CoreAuth[]>;
    findAll(): Promise<CoreAuth[]>;
    findByUidAndStrategy(uid: string, strategy: AuthStrategy): Promise<CoreAuth | null>;
    findByUidAndStrategies(uid: string, strategies: AuthStrategy[]): Promise<CoreAuth | null>;
    save(auth: CoreAuth): Promise<CoreAuth>;
    update(id: string, data: Partial<CoreAuth>): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByUid(uid: string): Promise<void>;
    findWithIdentifiers(id: string): Promise<CoreAuth | null>;
}
