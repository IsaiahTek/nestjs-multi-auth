import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfaMethodRepository } from '../../../auth/interfaces/repositories.interface';
import { MfaMethod as CoreMfaMethod } from '../../../auth/interfaces/models.interface';
import { MfaMethod } from '../entities/mfa-method.entity';

@Injectable()
export class TypeOrmMfaMethodRepository implements MfaMethodRepository {
  constructor(
    @InjectRepository(MfaMethod)
    private readonly repo: Repository<MfaMethod>,
  ) {}

  async create(data: Partial<CoreMfaMethod>): Promise<CoreMfaMethod> {
    return this.repo.create(data);
  }

  async findByUidAndEnabled(uid: string): Promise<CoreMfaMethod | null> {
    return this.repo.findOne({ where: { uid, isEnabled: true } });
  }

  async findByUidAndType(uid: string, type: any): Promise<CoreMfaMethod | null> {
    return this.repo.findOne({ where: { uid, type } });
  }

  async save(method: CoreMfaMethod): Promise<CoreMfaMethod> {
    return this.repo.save(method);
  }

  async deleteByUid(uid: string): Promise<void> {
    await this.repo.delete({ uid });
  }
}
