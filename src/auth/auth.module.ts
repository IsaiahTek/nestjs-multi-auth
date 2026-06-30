// src/auth/auth.module.ts
import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './core/jwt.strategy';
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
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { GoogleAuthStrategy } from './strategies/oauth/google.strategy';
import { FacebookAuthStrategy } from './strategies/oauth/facebook.strategy';
import { AppleAuthStrategy } from './strategies/oauth/apple.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { AuthContextService } from './core/auth-context.resolver';



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
        useClass: options.notificationProvider,
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
      exports: [AuthService, JwtAuthGuard, OptionalAuthGuard, ThrottlerModule, JwtModule, PassportModule, AUTH_MODULE_OPTIONS],
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
      AuthContextService,
    ];
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
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
        LocalAuthStrategy,
        GoogleAuthStrategy,
        FacebookAuthStrategy,
        AppleAuthStrategy,
        OAuthAuthStrategy,
        {
          provide: AUTH_NOTIFICATION_PROVIDER,
          useFactory: (opts: AuthModuleOptions, moduleRef: ModuleRef) => {
            const provider = opts.notificationProvider;
            if (!provider) return null;
            if (typeof provider === 'function' && provider.prototype) {
              try {
                return moduleRef.get(provider, { strict: false });
              } catch (e) {
                // Not registered as a provider, instantiate it directly
                return new (provider as any)();
              }
            }
            return provider;
          },
          inject: [AUTH_MODULE_OPTIONS, ModuleRef],
        },
        {
          provide: APP_GUARD,
          useFactory: (opts: AuthModuleOptions, guard: JwtAuthGuard) => {
            return opts.disableGlobalGuard ? { canActivate: () => true } : guard;
          },
          inject: [AUTH_MODULE_OPTIONS, JwtAuthGuard],
        },
      ],
      controllers: options.disableController ? [] : [AuthController],
      exports: [AuthService, JwtAuthGuard, OptionalAuthGuard, ThrottlerModule, JwtModule, PassportModule, AUTH_MODULE_OPTIONS],
    };
  }
}
export { AUTH_MODULE_OPTIONS };

