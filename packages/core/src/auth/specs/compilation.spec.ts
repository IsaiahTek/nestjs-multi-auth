import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN, OTP_TOKEN_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '../auth.module';
// removed entity import auth.entity';
// removed entity import oauth-provider.entity';
// removed entity import auth-identify.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
// removed entity import session.entity';
import { DataSource } from 'typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';
import { AuthContextService } from '../core/auth-context.resolver';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
    findByUidAndEnabled: jest.fn(),
    findAllByUid: jest.fn(),
    findByUid: jest.fn(),
    findLatestUnusedByPurpose: jest.fn(),
    issue: jest.fn(),
    verify: jest.fn(),
    resend: jest.fn(),
    deleteByUid: jest.fn(),
    findById: jest.fn(),
    findByUidAndNamespace: jest.fn(),
    findByStrategyAndValue: jest.fn()
});

let mockRepo: any = createMockRepo();

describe('AuthModule Compilation', () => {
    let module: TestingModule;

    
    const mockCookieService = {
        get: jest.fn().mockReturnValue({
            accessTokenName: 'root_access_token',
            refreshTokenName: 'root_refresh_token',
        }),
    };

    it('should compile with default options', async () => {
        module = await Test.createTestingModule({
            imports: [
                AuthModule.register({
                    jwtSecret: 'test',
                    jwtRefreshSecret: 'test-refresh',
                    adapter: {
                        module: class MockAdapter {},
                        providers: [
                            { provide: AUTH_REPOSITORY_TOKEN, useValue: mockRepo },
                            { provide: SESSION_REPOSITORY_TOKEN, useValue: mockRepo },
                            { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockRepo },
                            { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: mockRepo },
                            { provide: OAUTH_PROVIDER_REPOSITORY_TOKEN, useValue: mockRepo },
                            { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
                            { provide: OTP_TOKEN_REPOSITORY_TOKEN, useValue: mockRepo },
                        ],
                        exports: [
                            AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN, OTP_TOKEN_REPOSITORY_TOKEN
                        ]
                    },
                }),
            ],
            providers: [
                { provide: DataSource, useValue: { transaction: jest.fn() } },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ]
        })
            .overrideProvider(AUTH_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(OAUTH_PROVIDER_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(AUTH_IDENTIFIER_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(AUTH_OTP_PROVIDER).useValue(mockRepo)
            .overrideProvider(MFA_METHOD_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(SESSION_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(LocalAuthStrategy).useValue({})
            .overrideProvider(GoogleAuthStrategy).useValue({})
            .overrideProvider(AppleAuthStrategy).useValue({})
            .overrideProvider(FacebookAuthStrategy).useValue({})
            .overrideProvider(AuthContextService).useValue(mockCookieService)
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        expect(module).toBeDefined();
    });
});
