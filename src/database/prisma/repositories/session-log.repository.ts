import { Injectable, Inject } from '@nestjs/common';
import { SessionLogRepository } from '../../../auth/interfaces/repositories.interface';
import { SessionLog as CoreSessionLog } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaSessionLogRepository implements SessionLogRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async save(data: CoreSessionLog): Promise<CoreSessionLog> { return this.prisma.sessionLog.update({ where: { id: data.id }, data: data as any }); }
  async saveMany(data: CoreSessionLog[]): Promise<CoreSessionLog[]> { return Promise.all(data.map(d => this.save(d))); }
  async create(data: Partial<CoreSessionLog>): Promise<CoreSessionLog> {
    return this.prisma.sessionLog.create({ data: data as any });
  }

  async findByUid(uid: string): Promise<CoreSessionLog[]> { return this.prisma.sessionLog.findMany({ where: { uid } }); }
  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }
  async findByUidAndNamespace(uid: string, namespace: string): Promise<CoreSessionLog[]> {
    return this.prisma.sessionLog.findMany({
      where: { uid, namespace },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}