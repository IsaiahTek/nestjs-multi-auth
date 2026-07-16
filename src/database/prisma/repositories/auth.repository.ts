import { Injectable, Inject } from '@nestjs/common';
import { AuthRepository } from '../../../auth/interfaces/repositories.interface';
import { Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
import { AuthStrategy } from '../../../auth/enums/auth-type.enum';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreAuth>): Promise<CoreAuth> {
    const { identifiers, ...rest } = data;
    return this.prisma.auth.create({
      data: {
        ...rest,
        identifiers: identifiers ? { create: identifiers } : undefined,
      } as any,
      include: { identifiers: true }
    });
  }

  async findById(id: string): Promise<CoreAuth | null> { return this.prisma.auth.findUnique({ where: { id }, include: { identifiers: true } }); }
  async findByUid(uid: string): Promise<CoreAuth | null> { return this.prisma.auth.findUnique({ where: { uid }, include: { identifiers: true } }); }
  async findAllByUid(uid: string): Promise<CoreAuth[]> { return this.prisma.auth.findMany({ where: { uid } }); }
  async findAll(): Promise<CoreAuth[]> { return this.prisma.auth.findMany(); }
  async findByUidAndStrategy(uid: string, strategy: AuthStrategy): Promise<CoreAuth | null> { return this.prisma.auth.findFirst({ where: { uid, strategy } }); }
  async findByUidAndStrategies(uid: string, strategies: AuthStrategy[]): Promise<CoreAuth | null> { return this.prisma.auth.findFirst({ where: { uid, strategy: { in: strategies } } }); }
  async save(auth: CoreAuth): Promise<CoreAuth> { 
    const { identifiers, oauthProviders, sessions, mfaMethods, lastUsedAt, meta, ...rest } = auth as any;
    return this.prisma.auth.update({ where: { id: auth.id }, data: rest }); 
  }
  async update(id: string, data: Partial<CoreAuth>): Promise<void> { 
    const { identifiers, oauthProviders, sessions, mfaMethods, lastUsedAt, meta, ...rest } = data as any;
    await this.prisma.auth.update({ where: { id }, data: rest }); 
  }
  async delete(id: string): Promise<void> { await this.prisma.auth.delete({ where: { id } }); }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.auth.deleteMany({ where: { uid } }); }
  async findWithIdentifiers(id: string): Promise<CoreAuth | null> { return this.prisma.auth.findUnique({ where: { id }, include: { identifiers: true } }); }
}