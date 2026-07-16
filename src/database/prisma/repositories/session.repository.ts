import { Injectable, Inject } from '@nestjs/common';
import { SessionRepository } from '../../../auth/interfaces/repositories.interface';
import { Session as CoreSession } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreSession>): Promise<CoreSession> {
    const { auth, ...rest } = data as any;
    const createData: any = { ...rest };
    
    if (auth && auth.id) {
      createData.authId = auth.id;
    } else if (data.uid) {
      createData.auth = { connect: { uid: data.uid } };
    }
    
    return this.prisma.session.create({ data: createData });
  }
  async findById(id: string): Promise<CoreSession | null> { return this.prisma.session.findUnique({ where: { id } }); }
  async findDeviceSession(uid: string, namespace: string | undefined, deviceFingerprint: string): Promise<CoreSession | null> {
    // simplified lookup since Prisma cannot easily query inside Json without raw queries across different DBs.
    return this.prisma.session.findFirst({ where: { uid } }); 
  }
  async findByUid(uid: string): Promise<CoreSession[]> { return this.prisma.session.findMany({ where: { uid } }); }
  async findByIdWithDetails(id: string, namespace?: string): Promise<CoreSession | null> { return this.prisma.session.findUnique({ where: { id } }); }
  async save(session: CoreSession): Promise<CoreSession> { 
    const { auth, ...rest } = session as any;
    return this.prisma.session.update({ where: { id: session.id }, data: rest }); 
  }
  async update(id: string, data: Partial<CoreSession>): Promise<void> { 
    const { auth, ...rest } = data as any;
    await this.prisma.session.update({ where: { id }, data: rest }); 
  }
  async delete(id: string): Promise<void> { await this.prisma.session.delete({ where: { id } }); }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.session.deleteMany({ where: { uid } }); }
  async transaction(runInTransaction: (repo: SessionRepository) => Promise<void>): Promise<void> { await runInTransaction(this); }
}