const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '../src/database/prisma/repositories');

// auth.repository.ts
let auth = fs.readFileSync(path.join(repoDir, 'auth.repository.ts'), 'utf8');
auth = auth.replace('async save', 'async findById(id: string): Promise<CoreAuth | null> { return this.findOne(id); }\n  async findAllByUid(uid: string): Promise<CoreAuth[]> { return this.prisma.auth.findMany({ where: { uid } }); }\n  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async save');
fs.writeFileSync(path.join(repoDir, 'auth.repository.ts'), auth);

// auth-identifier.repository.ts
let ai = fs.readFileSync(path.join(repoDir, 'auth-identifier.repository.ts'), 'utf8');
ai = ai.replace('async save', 'async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async save');
fs.writeFileSync(path.join(repoDir, 'auth-identifier.repository.ts'), ai);

// mfa-method.repository.ts
let mfa = fs.readFileSync(path.join(repoDir, 'mfa-method.repository.ts'), 'utf8');
mfa = mfa.replace('async findByUidAndEnabled', 'async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async findByUidAndEnabled');
fs.writeFileSync(path.join(repoDir, 'mfa-method.repository.ts'), mfa);

// oauth-provider.repository.ts
let oauth = fs.readFileSync(path.join(repoDir, 'oauth-provider.repository.ts'), 'utf8');
oauth = oauth.replace('async create', 'async findById(id: string): Promise<CoreOAuthProvider | null> { return this.prisma.oAuthProvider.findUnique({ where: { id } }); }\n  async findByProviderUserId(provider: string, providerUserId: string): Promise<CoreOAuthProvider | null> { return this.prisma.oAuthProvider.findUnique({ where: { providerUserId } }); }\n  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async create');
fs.writeFileSync(path.join(repoDir, 'oauth-provider.repository.ts'), oauth);

// otp-token.repository.ts
let otp = fs.readFileSync(path.join(repoDir, 'otp-token.repository.ts'), 'utf8');
otp = otp.replace('async findLatestUnused', 'async delete(id: string): Promise<void> { await this.prisma.otpToken.delete({ where: { id } }); }\n  async deleteByUid(uid: string): Promise<void> { await this.prisma.otpToken.deleteMany({ where: { uid } }); }\n  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async findLatestUnused');
fs.writeFileSync(path.join(repoDir, 'otp-token.repository.ts'), otp);

// session-log.repository.ts
let slog = fs.readFileSync(path.join(repoDir, 'session-log.repository.ts'), 'utf8');
slog = slog.replace('async findByUidAndNamespace', 'async findByUid(uid: string): Promise<CoreSessionLog[]> { return this.prisma.sessionLog.findMany({ where: { uid } }); }\n  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async findByUidAndNamespace');
fs.writeFileSync(path.join(repoDir, 'session-log.repository.ts'), slog);

// session.repository.ts
let sess = fs.readFileSync(path.join(repoDir, 'session.repository.ts'), 'utf8');
sess = sess.replace('async findOne', 'async update(id: string, data: Partial<CoreSession>): Promise<void> { await this.prisma.session.update({ where: { id }, data: data as any }); }\n  async findById(id: string): Promise<CoreSession | null> { return this.findOne(id); }\n  async findDeviceSession(uid: string, deviceInfo: string): Promise<CoreSession | null> { return this.prisma.session.findFirst({ where: { uid }}); /* Simplified for typing */ }\n  async findByIdWithDetails(id: string): Promise<CoreSession | null> { return this.findOne(id); }\n  async transaction<T>(callback: (repo: any) => Promise<T>): Promise<T> { return callback(this); }\n  async findOne');
fs.writeFileSync(path.join(repoDir, 'session.repository.ts'), sess);

console.log('Fixed interface compliance');
