import { AuthModule } from '../auth.module';
import { AuthController } from '../auth.controller';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
import { APP_GUARD } from '@nestjs/core';

describe('AuthModule.forRootAsync (Pure)', () => {
  it('should return a DynamicModule with all strategies registered', () => {
    const options = {
      useFactory: () => ({
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-secret',
      }),
    };
    const dynamicModule = AuthModule.forRootAsync(options);

    expect(dynamicModule.providers).toContain(LocalAuthStrategy);
    expect(dynamicModule.providers).toContain(GoogleAuthStrategy);
    expect(dynamicModule.providers).toContain(FacebookAuthStrategy);
    expect(dynamicModule.providers).toContain(AppleAuthStrategy);
    expect(dynamicModule.providers).toContain(OAuthAuthStrategy);
  });

  it('should include a factory for APP_GUARD', () => {
    const options = {
      useFactory: () => ({
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-secret',
      }),
    };
    const dynamicModule = AuthModule.forRootAsync(options);
    const appGuardProvider: any = dynamicModule.providers?.find(
      (p: any) => p.provide === APP_GUARD
    );

    expect(appGuardProvider).toBeDefined();
    expect(appGuardProvider.useFactory).toBeInstanceOf(Function);
  });

  it('should not include AuthController if disableController is true in async options', () => {
    const options = {
      disableController: true,
      useFactory: () => ({
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-secret',
      }),
    };
    const dynamicModule = AuthModule.forRootAsync(options);
    expect(dynamicModule.controllers).toEqual([]);
  });

  it('should include AuthController by default if disableController is not provided', () => {
    const options = {
      useFactory: () => ({
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-secret',
      }),
    };
    const dynamicModule = AuthModule.forRootAsync(options);
    expect(dynamicModule.controllers).toContain(AuthController);
  });
});
