// src/auth/auth.module.ts
import { Module, DynamicModule, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { GoogleAuthStrategy } from './strategies/oauth/google.strategy';
import { AppleAuthStrategy } from './strategies/oauth/apple.strategy';
import { FacebookAuthStrategy } from './strategies/oauth/facebook.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthStrategy } from './auth-type.enum';
import { PassportModule } from '@nestjs/passport';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { Session } from './entities/session.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER } from './interfaces/auth-notification-provider.interface';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({})
export class AuthModule {
  static register(options: AuthModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useValue: options,
    };

    const providers: Provider[] = [
      optionsProvider,
      JwtStrategy,
      AuthService,
      JwtAuthGuard,
      OptionalAuthGuard,
      ThrottlerGuard,
    ];

    const enabledStrategies = options.enabledStrategies || Object.values(AuthStrategy);

    const isLocalEnabled = enabledStrategies.some(s =>
      [AuthStrategy.EMAIL, AuthStrategy.PHONE, AuthStrategy.USERNAME, AuthStrategy.LOCAL].includes(s)
    );

    const isOAuthEnabled = enabledStrategies.some(s =>
      [AuthStrategy.GOOGLE, AuthStrategy.FACEBOOK, AuthStrategy.APPLE, AuthStrategy.OAUTH].includes(s)
    );

    const isOtpEnabled = enabledStrategies.includes('OTP' as any); // Check for legacy if needed, but the user said it is NOT a strategy
    // Actually, let's just remove the explicit isOtpEnabled check for providers if the strategy is deleted.
    // We'll keep the OTP repo and other things, but OtpAuthStrategy is gone.

    if (isLocalEnabled) {
      providers.push(LocalAuthStrategy);
    }

    if (isOAuthEnabled) {
      providers.push(
        OAuthAuthStrategy,
        GoogleAuthStrategy,
        AppleAuthStrategy,
        FacebookAuthStrategy,
      );
    }

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
      exports: [AuthService, JwtAuthGuard, ThrottlerModule],
    };
  }
}
export { AUTH_MODULE_OPTIONS };

