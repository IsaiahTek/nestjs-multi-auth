const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '../src/database/prisma/repositories');

// auth-identifier.repository.ts missing findById
let ai = fs.readFileSync(path.join(repoDir, 'auth-identifier.repository.ts'), 'utf8');
ai = ai.replace('async delete', 'async findById(id: string): Promise<CoreAuthIdentifier | null> { return this.prisma.authIdentifier.findUnique({ where: { id }, include: { auth: true } }); }\n  async delete');
fs.writeFileSync(path.join(repoDir, 'auth-identifier.repository.ts'), ai);

// auth.repository.ts missing deleteByUid
let auth = fs.readFileSync(path.join(repoDir, 'auth.repository.ts'), 'utf8');
auth = auth.replace('async delete', 'async deleteByUid(uid: string): Promise<void> { await this.prisma.auth.deleteMany({ where: { uid }}); }\n  async delete');
fs.writeFileSync(path.join(repoDir, 'auth.repository.ts'), auth);

// mfa-method.repository.ts missing findByType
let mfa = fs.readFileSync(path.join(repoDir, 'mfa-method.repository.ts'), 'utf8');
mfa = mfa.replace('async delete', 'async findByType(uid: string, type: string): Promise<CoreMfaMethod[]> { return this.prisma.mfaMethod.findMany({ where: { auth: { uid }, type } }); }\n  async delete');
fs.writeFileSync(path.join(repoDir, 'mfa-method.repository.ts'), mfa);

// oauth-provider.repository.ts missing save
let oauth = fs.readFileSync(path.join(repoDir, 'oauth-provider.repository.ts'), 'utf8');
oauth = oauth.replace('async delete', 'async save(data: CoreOAuthProvider): Promise<CoreOAuthProvider> { return this.prisma.oAuthProvider.update({ where: { id: data.id }, data: data as any }); }\n  async delete');
fs.writeFileSync(path.join(repoDir, 'oauth-provider.repository.ts'), oauth);

console.log('Fixed interfaces 3');
