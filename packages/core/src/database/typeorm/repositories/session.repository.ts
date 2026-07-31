import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionRepository } from '../../../auth/interfaces/repositories.interface';
import { Session as CoreSession } from '../../../auth/interfaces/models.interface';
import { Session } from '../entities/session.entity';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async create(data: Partial<CoreSession>): Promise<CoreSession> {
    return this.repo.create(data);
  }

  async findById(id: string): Promise<CoreSession | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findDeviceSession(uid: string, namespace: string | undefined, deviceFingerprint: string): Promise<CoreSession | null> {
    const where: any = { uid, deviceFingerprint };
    if (namespace !== undefined) {
      where.namespace = namespace;
    }
    return this.repo.findOne({ where });
  }

  async findByUid(uid: string): Promise<CoreSession[]> {
    return this.repo.find({ where: { uid } });
  }

  async findByIdWithDetails(id: string, namespace?: string): Promise<CoreSession | null> {
    const where: any = { id };
    if (namespace !== undefined) {
      where.namespace = namespace;
    }
    return this.repo.findOne({
      where,
      select: [
        'id',
        'uid',
        'refreshTokenHash',
        'expiresAt',
        'deviceFingerprint',
        'ipAddress',
        'namespace',
      ],
    });
  }

  async save(session: CoreSession): Promise<CoreSession> {
    return this.repo.save(session);
  }

  async update(id: string, data: Partial<CoreSession>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByUid(uid: string): Promise<void> {
    await this.repo.delete({ uid });
  }

  async transaction(runInTransaction: (repo: SessionRepository) => Promise<void>): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      const transactionalRepo = new TypeOrmSessionRepository(manager.getRepository(Session));
      await runInTransaction(transactionalRepo);
    });
  }
}
