// src/auth/auth.module.ts
import { Module, DynamicModule, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { PasswordAuthStrategy } from './strategies/password.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { GoogleAuthStrategy } from './strategies/google.strategy';
import { OtpAuthStrategy } from './strategies/otp.strategy';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { Session } from './entities/session.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AUTH_USER_SERVICE } from './interfaces/auth-user-service.interface';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({})
export class AuthModule {
  static register(options: AuthModuleOptions): DynamicModule {
    if (!options.userService && !options.useExisting) {
      throw new Error('AuthModule requires either `userService` or `useExisting` to be provided.');
    }

    const userServiceProvider: Provider = options.useExisting
      ? {
        provide: AUTH_USER_SERVICE,
        useExisting: options.useExisting,
      }
      : {
        provide: AUTH_USER_SERVICE,
        useClass: options.userService!,
      };

    const optionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useValue: options,
    };

    const providers: Provider[] = [
      optionsProvider,
      userServiceProvider,
      JwtStrategy,
      AuthService,
      PasswordAuthStrategy,
      GoogleAuthStrategy,
      OtpAuthStrategy,
    ];

    if (!options.disableGlobalGuard) {
      providers.push({
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      });
    }

    return {
      module: AuthModule,
      imports: [
        ...(options.imports || []),
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
      ],
      providers,
      controllers: [AuthController],
      exports: [AuthService, AUTH_USER_SERVICE, JwtAuthGuard],
    };
  }
}
export { AUTH_MODULE_OPTIONS };

