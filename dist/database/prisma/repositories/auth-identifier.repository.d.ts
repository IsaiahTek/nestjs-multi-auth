import { AuthIdentifierRepository } from '../../../auth/interfaces/repositories.interface';
import { AuthIdentifier as CoreAuthIdentifier, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
export declare class PrismaAuthIdentifierRepository implements AuthIdentifierRepository {
    private readonly prisma;
    constructor(prisma: any);
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
