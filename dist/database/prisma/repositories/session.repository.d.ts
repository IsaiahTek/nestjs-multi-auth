import { SessionRepository } from '../../../auth/interfaces/repositories.interface';
import { Session as CoreSession } from '../../../auth/interfaces/models.interface';
export declare class PrismaSessionRepository implements SessionRepository {
    private readonly prisma;
    constructor(prisma: any);
    create(data: Partial<CoreSession>): Promise<CoreSession>;
    findById(id: string): Promise<CoreSession | null>;
    findDeviceSession(uid: string, namespace: string | undefined, deviceFingerprint: string): Promise<CoreSession | null>;
    findByUid(uid: string): Promise<CoreSession[]>;
    findByIdWithDetails(id: string, namespace?: string): Promise<CoreSession | null>;
    save(session: CoreSession): Promise<CoreSession>;
    update(id: string, data: Partial<CoreSession>): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByUid(uid: string): Promise<void>;
    transaction(runInTransaction: (repo: SessionRepository) => Promise<void>): Promise<void>;
}
