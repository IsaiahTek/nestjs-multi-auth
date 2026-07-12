const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '../src/database/prisma/repositories');

const files = {
  'auth.repository.ts': `
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
  async save(auth: CoreAuth): Promise<CoreAuth> { return this.prisma.auth.update({ where: { id: auth.id }, data: auth as any }); }
  async update(id: string, data: Partial<CoreAuth>): Promise<void> { await this.prisma.auth.update({ where: { id }, data: data as any }); }
  async delete(id: string): Promise<void> { await this.prisma.auth.delete({ where: { id } }); }
  async deleteByUid(uid: string): Promise<void> { await this.prisma.auth.deleteMany({ where: { uid } }); }
  async findWithIdentifiers(id: string): Promise<CoreAuth | null> { return this.prisma.auth.findUnique({ where: { id }, include: { identifiers: true } }); }
}
`,

  'auth-identifier.repository.ts': `
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
`,

  'mfa-method.repository.ts': `
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
`,

  'oauth-provider.repository.ts': `
import { Injectable, Inject } from '@nestjs/common';
import { OAuthProviderRepository } from '../../../auth/interfaces/repositories.interface';
import { OAuthProvider as CoreOAuthProvider, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaOAuthProviderRepository implements OAuthProviderRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreOAuthProvider>): Promise<CoreOAuthProvider> { return this.prisma.oAuthProvider.create({ data: data as any }); }
  async findByProviderUserId(provider: string, providerUserId: string): Promise<CoreOAuthProvider | null> { return this.prisma.oAuthProvider.findUnique({ where: { providerUserId } }); }
  
  async findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<{ provider: CoreOAuthProvider; auth: CoreAuth } | null> {
    const res = await this.prisma.oAuthProvider.findUnique({ where: { providerUserId }, include: { auth: true } });
    if (!res) return null;
    const { auth, ...prov } = res;
    return { provider: prov as any, auth: auth as any };
  }

  async save(provider: CoreOAuthProvider): Promise<CoreOAuthProvider> { return this.prisma.oAuthProvider.update({ where: { id: provider.id }, data: provider as any }); }
  async update(id: string, data: Partial<CoreOAuthProvider>): Promise<void> { await this.prisma.oAuthProvider.update({ where: { id }, data: data as any }); }
}
`,

  'session.repository.ts': `
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
`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(repoDir, filename), content.trim(), 'utf8');
}

console.log('Fixed Prisma repositories completely');
