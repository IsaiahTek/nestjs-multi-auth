import { Repository } from 'typeorm';
import { SessionLogRepository } from '../../../auth/interfaces/repositories.interface';
import { SessionLog as CoreSessionLog } from '../../../auth/interfaces/models.interface';
import { SessionLog } from '../entities/session_log.entity';
export declare class TypeOrmSessionLogRepository implements SessionLogRepository {
    private readonly repo;
    constructor(repo: Repository<SessionLog>);
    create(data: Partial<CoreSessionLog>): Promise<CoreSessionLog>;
    save(log: CoreSessionLog): Promise<CoreSessionLog>;
    saveMany(logs: CoreSessionLog[]): Promise<CoreSessionLog[]>;
    findByUidAndNamespace(uid: string, namespace?: string): Promise<CoreSessionLog[]>;
}
