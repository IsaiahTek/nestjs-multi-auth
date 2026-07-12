import { SessionLogRepository } from '../../../auth/interfaces/repositories.interface';
import { SessionLog as CoreSessionLog } from '../../../auth/interfaces/models.interface';
export declare class PrismaSessionLogRepository implements SessionLogRepository {
    private readonly prisma;
    constructor(prisma: any);
    save(data: CoreSessionLog): Promise<CoreSessionLog>;
    saveMany(data: CoreSessionLog[]): Promise<CoreSessionLog[]>;
    create(data: Partial<CoreSessionLog>): Promise<CoreSessionLog>;
    findByUid(uid: string): Promise<CoreSessionLog[]>;
    transaction<T>(callback: (repo: any) => Promise<T>): Promise<T>;
    findByUidAndNamespace(uid: string, namespace: string): Promise<CoreSessionLog[]>;
}
