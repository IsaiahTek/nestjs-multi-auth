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
import { OtpAuthStrategy } from './strategies/otp.strategy';
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
    ];

    const enabledStrategies = options.enabledStrategies || [
      AuthStrategy.LOCAL,
      AuthStrategy.OAUTH,
      AuthStrategy.OTP,
    ];

    if (enabledStrategies.includes(AuthStrategy.LOCAL)) {
      providers.push(LocalAuthStrategy);
    }

    if (enabledStrategies.includes(AuthStrategy.OTP)) {
      providers.push(OtpAuthStrategy);
    }

    if (enabledStrategies.includes(AuthStrategy.OAUTH)) {
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
        JwtModule.register({ secret: options.jwtSecret || process.env.JWT_SECRET || 'changeme' }),
        ...(options.imports || []),
      ],
      providers,
      controllers: options.disableController ? [] : [AuthController],
      exports: [AuthService, JwtAuthGuard],
    };
  }
}
export { AUTH_MODULE_OPTIONS };

