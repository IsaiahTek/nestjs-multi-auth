import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpTokenRepository } from '../../../auth/interfaces/repositories.interface';
import { OtpToken as CoreOtpToken } from '../../../auth/interfaces/models.interface';
import { OtpToken } from '../entities/otp-token.entity';

@Injectable()
export class TypeOrmOtpTokenRepository implements OtpTokenRepository {
  constructor(
    @InjectRepository(OtpToken)
    private readonly repo: Repository<OtpToken>,
  ) {}

  async create(data: Partial<CoreOtpToken>): Promise<CoreOtpToken> {
    return this.repo.create(data);
  }

  async findLatestUnused(uid: string): Promise<CoreOtpToken | null> {
    return this.repo.findOne({
      where: { requestUserId: uid, isUsed: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatestUnusedByPurpose(uid: string, purpose: any): Promise<CoreOtpToken | null> {
    return this.repo.findOne({
      where: { requestUserId: uid, purpose, isUsed: false },
      order: { createdAt: 'DESC' },
    });
  }

  async save(token: CoreOtpToken): Promise<CoreOtpToken> {
    return this.repo.save(token);
  }

  async deleteByUid(uid: string): Promise<void> {
    await this.repo.delete({ requestUserId: uid });
  }
}
