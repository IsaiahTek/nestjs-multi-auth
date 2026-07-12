import { Repository } from 'typeorm';
import { OtpTokenRepository } from '../../../auth/interfaces/repositories.interface';
import { OtpToken as CoreOtpToken } from '../../../auth/interfaces/models.interface';
import { OtpToken } from '../entities/otp-token.entity';
export declare class TypeOrmOtpTokenRepository implements OtpTokenRepository {
    private readonly repo;
    constructor(repo: Repository<OtpToken>);
    create(data: Partial<CoreOtpToken>): Promise<CoreOtpToken>;
    findLatestUnused(uid: string): Promise<CoreOtpToken | null>;
    findLatestUnusedByPurpose(uid: string, purpose: any): Promise<CoreOtpToken | null>;
    save(token: CoreOtpToken): Promise<CoreOtpToken>;
    deleteByUid(uid: string): Promise<void>;
}
