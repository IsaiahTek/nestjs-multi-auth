import { Injectable, Inject } from '@nestjs/common';
import { AuthIdentifierRepository } from '../../../auth/interfaces/repositories.interface';
import { AuthIdentifier as CoreAuthIdentifier, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaAuthIdentifierRepository implements AuthIdentifierRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreAuthIdentifier>): Promise<CoreAuthIdentifier> { return this.prisma.authIdentifier.create({ data: data as any }); }
  async findByValue(value: string): Promise<CoreAuthIdentifier | null> { return this.prisma.authIdentifier.findUnique({ where: { value } }); }
  async findByAuthId(authId: string): Promise<CoreAuthIdentifier[]> { return this.prisma.authIdentifier.findMany({ where: { authId } }); }
  async findByUidAndTypes(uid: string, types: string[]): Promise<CoreAuthIdentifier | null> { return this.prisma.authIdentifier.findFirst({ where: { auth: { uid }, type: { in: types } }}); }
  
  async findWithAuthByValue(value: string): Promise<{ identifier: CoreAuthIdentifier; auth: CoreAuth } | null> {
    const res = await this.prisma.authIdentifier.findUnique({ where: { value }, include: { auth: true } });
    if (!res) return null;
    const { auth, ...identifier } = res;
    return { identifier: identifier as any, auth: auth as any };
  }
  
  async save(identifier: CoreAuthIdentifier): Promise<CoreAuthIdentifier> { return this.prisma.authIdentifier.update({ where: { id: identifier.id }, data: identifier as any }); }
  async markVerifiedByAuthId(authId: string): Promise<void> { await this.prisma.authIdentifier.updateMany({ where: { authId }, data: { isVerified: true } }); }
}