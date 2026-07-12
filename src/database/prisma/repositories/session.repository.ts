import { Injectable, Inject } from '@nestjs/common';
import { SessionRepository } from '../../../auth/interfaces/repositories.interface';
import { Session as CoreSession } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreSession>): Promise<CoreSession> { return this.prisma.session.create({ data: data as any }); }
  async findById(id: string): Promise<CoreSession | null> { return this.prisma.session.findUnique({ where: { id } }); }
  async findDeviceSession(uid: string, namespace: string | undefined, deviceFingerprint: string): Promise<CoreSession | null> {
    // simplified lookup since Prisma cannot easily query inside Json without raw queries across different DBs.
    return this.prisma.session.findFirst({ where: { uid } }); 
  }
  async findByUid(uid: string): Promise<CoreSession[]> { return this.prisma.session.findMany({ where: { uid } }); }
  async findByIdWithDetails(id: string, namespace?: string): Promise<CoreSession | null> { return this.prisma.session.findUnique({ where: { id } }); }
  async save(session: CoreSession): Promise<CoreSession> { return this.prisma.session.update({ where: { id: session.id }, data: session as any }); }
  async update(id: string, data: Partial<CoreSession>): Promise<void> { await this.prisma.session.update({ where: { id }, data: data as any }); }
  async delete(id: string): Promise<void> { await this.prisma.session.delete({ where: { id } }); }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.session.deleteMany({ where: { uid } }); }
  async transaction(runInTransaction: (repo: SessionRepository) => Promise<void>): Promise<void> { await runInTransaction(this); }
}