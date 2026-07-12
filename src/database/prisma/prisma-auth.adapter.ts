import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import {
  AUTH_REPOSITORY_TOKEN,
  AUTH_IDENTIFIER_REPOSITORY_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  MFA_METHOD_REPOSITORY_TOKEN,
  OAUTH_PROVIDER_REPOSITORY_TOKEN,
  SESSION_LOG_REPOSITORY_TOKEN,
  OTP_TOKEN_REPOSITORY_TOKEN,
} from '../../auth/interfaces/repository-tokens';

import {
  PrismaAuthRepository,
  PrismaAuthIdentifierRepository,
  PrismaSessionRepository,
  PrismaMfaMethodRepository,
  PrismaOAuthProviderRepository,
  PrismaSessionLogRepository,
  PrismaOtpTokenRepository,
} from './repositories';

export interface PrismaAuthAdapterOptions {
  /**
   * The injection token for your Prisma Service.
   * Default: 'PRISMA_SERVICE'
   */
  prismaServiceToken?: string | symbol | any;
}

@Global()
@Module({})
export class PrismaAuthAdapter {
  static register(options: PrismaAuthAdapterOptions = {}): DynamicModule {
    const prismaServiceToken = options.prismaServiceToken || 'PRISMA_SERVICE';

    const aliasProvider: Provider = {
      provide: 'PRISMA_SERVICE_TOKEN',
      useExisting: prismaServiceToken,
    };

    const providers: Provider[] = [
      aliasProvider,
      {
        provide: AUTH_REPOSITORY_TOKEN,
        useClass: PrismaAuthRepository,
      },
      {
        provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN,
        useClass: PrismaAuthIdentifierRepository,
      },
      {
        provide: SESSION_REPOSITORY_TOKEN,
        useClass: PrismaSessionRepository,
      },
      {
        provide: MFA_METHOD_REPOSITORY_TOKEN,
        useClass: PrismaMfaMethodRepository,
      },
      {
        provide: OAUTH_PROVIDER_REPOSITORY_TOKEN,
        useClass: PrismaOAuthProviderRepository,
      },
      {
        provide: SESSION_LOG_REPOSITORY_TOKEN,
        useClass: PrismaSessionLogRepository,
      },
      {
        provide: OTP_TOKEN_REPOSITORY_TOKEN,
        useClass: PrismaOtpTokenRepository,
      },
    ];

    return {
      module: PrismaAuthAdapter,
      providers,
      exports: providers.map(p => (p as any).provide),
    };
  }
}
