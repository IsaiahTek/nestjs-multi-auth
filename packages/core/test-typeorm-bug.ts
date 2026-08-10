import { createConnection } from 'typeorm';
import { Auth } from './src/database/typeorm/entities/auth.entity';
import { AuthIdentifier } from './src/database/typeorm/entities/auth-identify.entity';
import { Session } from './src/database/typeorm/entities/session.entity';
import { MfaMethod } from './src/database/typeorm/entities/mfa-method.entity';
import { OAuthProvider } from './src/database/typeorm/entities/oauth-provider.entity';
import { TypeOrmAuthRepository } from './src/database/typeorm/repositories/auth.repository';
import { TypeOrmAuthIdentifierRepository } from './src/database/typeorm/repositories/auth-identifier.repository';
import { AuthStrategy } from './src/auth/enums/auth-type.enum';
import { IdentifierType, IdentifierSource } from './src/auth/enums/identifier-type.enum';

async function run() {
  const conn = await createConnection({
    type: 'sqlite',
    database: ':memory:',
    entities: [Auth, AuthIdentifier, Session, MfaMethod, OAuthProvider],
    synchronize: true,
    logging: false,
  });

  const authRepo = new TypeOrmAuthRepository(conn.getRepository(Auth));
  const idRepo = new TypeOrmAuthIdentifierRepository(conn.getRepository(AuthIdentifier));

  // 1. Create auth
  const newAuth = await authRepo.create({
    uid: 'test-uid',
    strategy: AuthStrategy.PHONE,
    isActive: true,
    isPrimary: true,
    isVerified: false,
  });

  // 2. Create identifier
  const newId = await idRepo.create({
    auth: newAuth,
    type: IdentifierType.PHONE,
    value: '+2347062860995',
    isVerified: false,
    source: IdentifierSource.LOCAL,
  });

  newAuth.identifiers = [newId];

  // 3. Save
  await authRepo.save(newAuth);

  // 4. Try to find
  const result = await idRepo.findWithAuthByValue('+2347062860995'.toLowerCase());
  console.log('Result:', result ? 'FOUND' : 'NOT FOUND');
  if (result) {
    console.log('Auth present:', !!result.auth);
  }

  const result2 = await idRepo.findByValue('+2347062860995');
  console.log('FindByValue Result:', result2 ? 'FOUND' : 'NOT FOUND');
  if (result2) {
    console.log('FindByValue AuthId:', result2.auth);
  }

  await conn.close();
}

run().catch(console.error);
