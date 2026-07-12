import { Injectable, Inject } from '@nestjs/common';
import { OtpTokenRepository } from '../../../auth/interfaces/repositories.interface';
import { OtpToken as CoreOtpToken } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaOtpTokenRepository implements OtpTokenRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreOtpToken>): Promise<CoreOtpToken> {
    return this.prisma.otpToken.create({ data: data as any });
  }

  async save(data: CoreOtpToken): Promise<CoreOtpToken> {
    return this.prisma.otpToken.update({
      where: { id: data.id },
      data: data as any,
    });
  }

  async delete(id: string): Promise<void> { await this.prisma.otpToken.delete({ where: { id } }); }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.otpToken.deleteMany({ where: { uid } }); }
  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }
  async findLatestUnused(uid: string): Promise<CoreOtpToken | null> {
    return this.prisma.otpToken.findFirst({
      where: { uid, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestUnusedByPurpose(uid: string, purpose: string): Promise<CoreOtpToken | null> {
    return this.prisma.otpToken.findFirst({
      where: { uid, purpose, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });
  }
}