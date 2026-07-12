import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionLogRepository } from '../../../auth/interfaces/repositories.interface';
import { SessionLog as CoreSessionLog } from '../../../auth/interfaces/models.interface';
import { SessionLog } from '../entities/session_log.entity';

@Injectable()
export class TypeOrmSessionLogRepository implements SessionLogRepository {
  constructor(
    @InjectRepository(SessionLog)
    private readonly repo: Repository<SessionLog>,
  ) {}

  async create(data: Partial<CoreSessionLog>): Promise<CoreSessionLog> {
    return this.repo.create(data);
  }

  async save(log: CoreSessionLog): Promise<CoreSessionLog> {
    return this.repo.save(log);
  }

  async saveMany(logs: CoreSessionLog[]): Promise<CoreSessionLog[]> {
    return this.repo.save(logs);
  }

  async findByUidAndNamespace(uid: string, namespace?: string): Promise<CoreSessionLog[]> {
    const where: any = { uid };
    if (namespace !== undefined) {
      where.namespace = namespace;
    }
    return this.repo.find({ where });
  }
}
