import { Injectable, Inject } from '@nestjs/common';
import { MfaMethodRepository } from '../../../auth/interfaces/repositories.interface';
import { MfaMethod as CoreMfaMethod } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaMfaMethodRepository implements MfaMethodRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreMfaMethod>): Promise<CoreMfaMethod> { return this.prisma.mfaMethod.create({ data: data as any }); }
  async findByUidAndType(uid: string, type: string): Promise<CoreMfaMethod | null> { return this.prisma.mfaMethod.findFirst({ where: { auth: { uid }, type } }); }
  async findByUidAndEnabled(uid: string): Promise<CoreMfaMethod | null> { return this.prisma.mfaMethod.findFirst({ where: { auth: { uid }, isEnabled: true } }); }
  async save(method: CoreMfaMethod): Promise<CoreMfaMethod> { return this.prisma.mfaMethod.update({ where: { id: method.id }, data: method as any }); }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.mfaMethod.deleteMany({ where: { auth: { uid } } }); }
}