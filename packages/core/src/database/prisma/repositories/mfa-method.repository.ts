import { Injectable, Inject } from '@nestjs/common';
import { MfaMethodRepository } from '../../../auth/interfaces/repositories.interface';
import { MfaMethod as CoreMfaMethod } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaMfaMethodRepository implements MfaMethodRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreMfaMethod>): Promise<CoreMfaMethod> {
    const { auth, ...rest } = data as any;
    const createData: any = { ...rest };
    
    if (auth && auth.id) {
      createData.authId = auth.id;
    } else if (data.uid) {
      createData.auth = { connect: { uid: data.uid } };
    }
    
    return this.prisma.mfaMethod.create({ data: createData });
  }
  async findByUidAndType(uid: string, type: string): Promise<CoreMfaMethod | null> { return this.prisma.mfaMethod.findFirst({ where: { auth: { uid }, type } }); }
  async findByUidAndEnabled(uid: string): Promise<CoreMfaMethod | null> { return this.prisma.mfaMethod.findFirst({ where: { auth: { uid }, isEnabled: true } }); }
  async save(method: CoreMfaMethod): Promise<CoreMfaMethod> { 
    const { auth, authId, uid, ...rest } = method as any;
    return this.prisma.mfaMethod.update({ where: { id: method.id }, data: rest }); 
  }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.mfaMethod.deleteMany({ where: { auth: { uid } } }); }
}