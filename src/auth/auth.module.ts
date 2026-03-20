// src/auth/auth.module.ts
import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './core/jwt.strategy';
import { AuthStrategy } from './enums/auth-type.enum';
import { PassportModule } from '@nestjs/passport';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { Session } from './entities/session.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER } from './interfaces/auth-notification-provider.interface';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createStrategyProviders } from './core/registration';
import { AuthModuleAsyncOptions } from './interfaces/auth-module-async-options.interface';
import { AuthSchemaInitializer } from '../migrations/auth-schema.initializer';
import { AuthMigrationService } from '../migrations/migration.service';



@Global()
@Module({})
export class AuthModule {
  static register(options: AuthModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useValue: options,
    };

    const strategyProviders = createStrategyProviders(options);

    const providers: Provider[] = [
      optionsProvider,
      ...this.createProviders(),
      ...strategyProviders,
    ];

    if (options.notificationProvider) {
      providers.push({
        provide: AUTH_NOTIFICATION_PROVIDER,
        useValue: options.notificationProvider,
      });
    }

    if (!options.disableGlobalGuard) {
      providers.push({
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      });
    }

    return {
      module: AuthModule,
      imports: [
        TypeOrmModule.forFeature([
          Auth,
          OAuthProvider,
          AuthIdentifier,
          OtpToken,
          MfaMethod,
          Session,
        ]),
        PassportModule,
        JwtModule.register({
          secret: options.jwtSecret || process.env.JWT_SECRET || 'changeme',
          signOptions: { expiresIn: (options.accessTokenExpiresIn || '15m') as any },
        }),
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: (options.throttlerTtl || 60) * 1000,
              limit: options.throttlerLimit || 10,
            },
          ],
        }),
        ...(options.imports || []),
      ],
      providers,
      controllers: options.disableController ? [] : [AuthController],
      exports: [AuthService, JwtAuthGuard, OptionalAuthGuard, ThrottlerModule, JwtModule, PassportModule],
    };
  }

  private static createProviders(): Provider[] {
    return [
      JwtStrategy,
      AuthService,
      JwtAuthGuard,
      OptionalAuthGuard,
      ThrottlerGuard,
      AuthMigrationService,
      AuthSchemaInitializer,

    ];
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [AuthStrategy.EMAIL],
    };

    return {
      module: AuthModule,
      global: true,
      imports: [
        TypeOrmModule.forFeature([
          Auth,
          OAuthProvider,
          AuthIdentifier,
          OtpToken,
          MfaMethod,
          Session,
        ]),
        PassportModule,
        JwtModule.registerAsync({
          inject: [AUTH_MODULE_OPTIONS],
          useFactory: async (opts: AuthModuleOptions) => ({
            secret: opts.jwtSecret || process.env.JWT_SECRET || 'changeme',
            signOptions: {
              expiresIn: (opts.accessTokenExpiresIn || '15m') as any,
            },
          }),
        }),
        ThrottlerModule.forRootAsync({
          inject: [AUTH_MODULE_OPTIONS],
          useFactory: async (opts: AuthModuleOptions) => ({
            throttlers: [
              {
                ttl: (opts.throttlerTtl || 60) * 1000,
                limit: opts.throttlerLimit || 10,
              },
            ],
          }),
        }),
        ...(options.imports || []),
      ],
      providers: [
        asyncOptionsProvider,
        ...this.createProviders(),
        {
          provide: AUTH_NOTIFICATION_PROVIDER,
          useFactory: (opts: AuthModuleOptions) => opts.notificationProvider,
          inject: [AUTH_MODULE_OPTIONS],
        },
      ],
      exports: [AuthService, JwtAuthGuard, OptionalAuthGuard, ThrottlerModule, JwtModule, PassportModule],
    };
  }
}
export { AUTH_MODULE_OPTIONS };

