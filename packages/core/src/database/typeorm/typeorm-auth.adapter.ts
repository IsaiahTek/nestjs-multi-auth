import { Module, DynamicModule, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { Session } from './entities/session.entity';
import { SessionLog } from './entities/session_log.entity';

import {
  TypeOrmAuthRepository,
  TypeOrmAuthIdentifierRepository,
  TypeOrmOAuthProviderRepository,
  TypeOrmOtpTokenRepository,
  TypeOrmMfaMethodRepository,
  TypeOrmSessionRepository,
  TypeOrmSessionLogRepository,
} from './repositories';

import {
  AUTH_REPOSITORY_TOKEN,
  AUTH_IDENTIFIER_REPOSITORY_TOKEN,
  OAUTH_PROVIDER_REPOSITORY_TOKEN,
  OTP_TOKEN_REPOSITORY_TOKEN,
  MFA_METHOD_REPOSITORY_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  SESSION_LOG_REPOSITORY_TOKEN,
} from '../../auth/interfaces/repository-tokens';

const entities = [
  Auth,
  AuthIdentifier,
  OAuthProvider,
  OtpToken,
  MfaMethod,
  Session,
  SessionLog,
];

const providers = [
  { provide: AUTH_REPOSITORY_TOKEN, useClass: TypeOrmAuthRepository },
  { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useClass: TypeOrmAuthIdentifierRepository },
  { provide: OAUTH_PROVIDER_REPOSITORY_TOKEN, useClass: TypeOrmOAuthProviderRepository },
  { provide: OTP_TOKEN_REPOSITORY_TOKEN, useClass: TypeOrmOtpTokenRepository },
  { provide: MFA_METHOD_REPOSITORY_TOKEN, useClass: TypeOrmMfaMethodRepository },
  { provide: SESSION_REPOSITORY_TOKEN, useClass: TypeOrmSessionRepository },
  { provide: SESSION_LOG_REPOSITORY_TOKEN, useClass: TypeOrmSessionLogRepository },
];

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: providers,
  exports: providers,
})
export class TypeOrmAuthAdapter {}
