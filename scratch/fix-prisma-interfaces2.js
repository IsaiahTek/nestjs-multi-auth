const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '../src/database/prisma/repositories');

// auth-identifier.repository.ts
let ai = fs.readFileSync(path.join(repoDir, 'auth-identifier.repository.ts'), 'utf8');
ai = ai.replace('async save', 'async delete(id: string): Promise<void> { await this.prisma.authIdentifier.delete({ where: { id }}); }\n  async deleteByValue(value: string): Promise<void> { await this.prisma.authIdentifier.delete({ where: { value }}); }\n  async save');
fs.writeFileSync(path.join(repoDir, 'auth-identifier.repository.ts'), ai);

// mfa-method.repository.ts
let mfa = fs.readFileSync(path.join(repoDir, 'mfa-method.repository.ts'), 'utf8');
mfa = mfa.replace('async delete', 'async deleteByUid(uid: string): Promise<void> { await this.prisma.mfaMethod.deleteMany({ where: { auth: { uid } }}); }\n  async delete');
fs.writeFileSync(path.join(repoDir, 'mfa-method.repository.ts'), mfa);

// oauth-provider.repository.ts
let oauth = fs.readFileSync(path.join(repoDir, 'oauth-provider.repository.ts'), 'utf8');
oauth = oauth.replace('async create', 'async delete(id: string): Promise<void> { await this.prisma.oAuthProvider.delete({ where: { id }}); }\n  async deleteByProviderUserId(provider: string, providerUserId: string): Promise<void> { await this.prisma.oAuthProvider.delete({ where: { providerUserId }}); }\n  async update(id: string, data: Partial<CoreOAuthProvider>): Promise<void> { await this.prisma.oAuthProvider.update({ where: { id }, data: data as any }); }\n  async create');
// Fix findWithAuthByProviderUserId return type (it might return any or missing something)
// The interface in OAuthProviderRepository says: `findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<OAuthProvider | null>;`
// I defined: `async findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<CoreOAuthProvider | null>`
// Maybe CoreOAuthProvider doesn't match OAuthProvider from model interface? Let's check the error: 
// It was: Property 'findWithAuthByProviderUserId' in type 'PrismaOAuthProviderRepository' is not assignable to the same property in base type 'OAuthProviderRepository'.
// Type '(provider: string, providerUserId: string) => Promise<{ id: string; authId: string; provider: string; providerUserId: string; accessToken: string | null; refreshToken: string | null; profile: JsonValue | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null; } & { ...; } | null>' is not assignable to type '(provider: string, providerUserId: string) => Promise<OAuthProvider | null>'.
// Prisma generated type has `profile: JsonValue | null`, but `CoreOAuthProvider` expects `profile?: Record<string, any>`.
// So we just need to typecast it to `any` or `CoreOAuthProvider`.
oauth = oauth.replace('return this.prisma.oAuthProvider.findUnique({', 'const res = await this.prisma.oAuthProvider.findUnique({\n      where: { providerUserId },\n      include: { auth: true },\n    });\n    return res as any;');
oauth = oauth.replace(/where: \{ providerUserId \},[\s\S]*?include: \{ auth: true \},[\s\S]*?\}\);/g, ''); // cleanup the old one
fs.writeFileSync(path.join(repoDir, 'oauth-provider.repository.ts'), oauth);

// session-log.repository.ts
let slog = fs.readFileSync(path.join(repoDir, 'session-log.repository.ts'), 'utf8');
slog = slog.replace('async create', 'async save(data: CoreSessionLog): Promise<CoreSessionLog> { return this.prisma.sessionLog.update({ where: { id: data.id }, data: data as any }); }\n  async saveMany(data: CoreSessionLog[]): Promise<CoreSessionLog[]> { return Promise.all(data.map(d => this.save(d))); }\n  async create');
fs.writeFileSync(path.join(repoDir, 'session-log.repository.ts'), slog);

console.log('Fixed more interface compliance');
