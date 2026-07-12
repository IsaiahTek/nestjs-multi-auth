import { OtpTokenRepository } from '../../../auth/interfaces/repositories.interface';
import { OtpToken as CoreOtpToken } from '../../../auth/interfaces/models.interface';
export declare class PrismaOtpTokenRepository implements OtpTokenRepository {
    private readonly prisma;
    constructor(prisma: any);
    create(data: Partial<CoreOtpToken>): Promise<CoreOtpToken>;
    save(data: CoreOtpToken): Promise<CoreOtpToken>;
    delete(id: string): Promise<void>;
    deleteByUid(uid: string): Promise<void>;
    transaction<T>(callback: (repo: any) => Promise<T>): Promise<T>;
    findLatestUnused(uid: string): Promise<CoreOtpToken | null>;
    findLatestUnusedByPurpose(uid: string, purpose: string): Promise<CoreOtpToken | null>;
}
