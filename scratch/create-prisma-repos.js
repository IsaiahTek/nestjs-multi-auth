const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '../src/database/prisma/repositories');
if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });

const files = {
  'auth.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { AuthRepository } from '../../../auth/interfaces/repositories.interface';
import { Auth as CoreAuth } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async findOne(id: string): Promise<CoreAuth | null> {
    return this.prisma.auth.findUnique({ where: { id }, include: { identifiers: true } });
  }

  async findByUid(uid: string): Promise<CoreAuth | null> {
    return this.prisma.auth.findUnique({ where: { uid }, include: { identifiers: true } });
  }

  async findByStrategyAndValue(strategy: string, value: string): Promise<CoreAuth | null> {
    const ai = await this.prisma.authIdentifier.findFirst({
      where: { value, auth: { strategy } },
      include: { auth: true }
    });
    return ai?.auth || null;
  }

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

  async save(data: CoreAuth): Promise<CoreAuth> {
    return this.prisma.auth.update({
      where: { id: data.id },
      data: data as any,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.auth.delete({ where: { id } });
  }
}
`,

  'auth-identifier.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { AuthIdentifierRepository } from '../../../auth/interfaces/repositories.interface';
import { AuthIdentifier as CoreAuthIdentifier } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaAuthIdentifierRepository implements AuthIdentifierRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreAuthIdentifier>): Promise<CoreAuthIdentifier> {
    return this.prisma.authIdentifier.create({ data: data as any });
  }

  async findByValue(value: string): Promise<CoreAuthIdentifier | null> {
    return this.prisma.authIdentifier.findUnique({ where: { value }, include: { auth: true } });
  }

  async findByAuthId(authId: string): Promise<CoreAuthIdentifier[]> {
    return this.prisma.authIdentifier.findMany({ where: { authId } });
  }

  async findByUidAndTypes(uid: string, types: string[]): Promise<CoreAuthIdentifier | null> {
    return this.prisma.authIdentifier.findFirst({
      where: {
        auth: { uid },
        type: { in: types },
      },
      orderBy: [
        { isVerified: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  async findWithAuthByValue(value: string): Promise<CoreAuthIdentifier | null> {
    return this.prisma.authIdentifier.findUnique({ where: { value }, include: { auth: true } });
  }

  async save(data: CoreAuthIdentifier): Promise<CoreAuthIdentifier> {
    return this.prisma.authIdentifier.update({
      where: { id: data.id },
      data: data as any,
    });
  }
}
`,

  'session.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { SessionRepository } from '../../../auth/interfaces/repositories.interface';
import { Session as CoreSession } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreSession>): Promise<CoreSession> {
    return this.prisma.session.create({ data: data as any });
  }

  async save(data: CoreSession): Promise<CoreSession> {
    return this.prisma.session.update({
      where: { id: data.id },
      data: data as any,
    });
  }

  async findOne(id: string): Promise<CoreSession | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async findByUid(uid: string): Promise<CoreSession[]> {
    return this.prisma.session.findMany({ where: { uid } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async deleteByUid(uid: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { uid } });
  }
}
`,

  'session-log.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { SessionLogRepository } from '../../../auth/interfaces/repositories.interface';
import { SessionLog as CoreSessionLog } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaSessionLogRepository implements SessionLogRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreSessionLog>): Promise<CoreSessionLog> {
    return this.prisma.sessionLog.create({ data: data as any });
  }

  async findByUidAndNamespace(uid: string, namespace: string): Promise<CoreSessionLog[]> {
    return this.prisma.sessionLog.findMany({
      where: { uid, namespace },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
`,

  'mfa-method.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { MfaMethodRepository } from '../../../auth/interfaces/repositories.interface';
import { MfaMethod as CoreMfaMethod } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaMfaMethodRepository implements MfaMethodRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreMfaMethod>): Promise<CoreMfaMethod> {
    return this.prisma.mfaMethod.create({ data: data as any });
  }

  async save(data: CoreMfaMethod): Promise<CoreMfaMethod> {
    return this.prisma.mfaMethod.update({
      where: { id: data.id },
      data: data as any,
    });
  }

  async findByUidAndEnabled(uid: string, isEnabled: boolean): Promise<CoreMfaMethod[]> {
    return this.prisma.mfaMethod.findMany({
      where: { auth: { uid }, isEnabled },
    });
  }

  async findAllByUid(uid: string): Promise<CoreMfaMethod[]> {
    return this.prisma.mfaMethod.findMany({
      where: { auth: { uid } },
    });
  }

  async findById(id: string): Promise<CoreMfaMethod | null> {
    return this.prisma.mfaMethod.findUnique({ where: { id }, include: { auth: true } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mfaMethod.delete({ where: { id } });
  }
}
`,

  'oauth-provider.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { OAuthProviderRepository } from '../../../auth/interfaces/repositories.interface';
import { OAuthProvider as CoreOAuthProvider } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaOAuthProviderRepository implements OAuthProviderRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<CoreOAuthProvider | null> {
    return this.prisma.oAuthProvider.findUnique({
      where: { providerUserId }, // Must match the exact schema constraints
      include: { auth: true },
    });
  }

  async create(data: Partial<CoreOAuthProvider>): Promise<CoreOAuthProvider> {
    return this.prisma.oAuthProvider.create({ data: data as any });
  }
}
`,

  'otp-token.repository.ts': `
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
`,

  'index.ts': `
export * from './auth.repository';
export * from './auth-identifier.repository';
export * from './session.repository';
export * from './session-log.repository';
export * from './mfa-method.repository';
export * from './oauth-provider.repository';
export * from './otp-token.repository';
`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(repoDir, filename), content.trim(), 'utf8');
}

console.log('Created Prisma repositories');
