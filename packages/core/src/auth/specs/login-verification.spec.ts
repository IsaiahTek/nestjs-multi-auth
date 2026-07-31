import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN, OTP_TOKEN_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AuthModule } from '../auth.module';
// removed entity import auth.entity';
// removed entity import auth-identify.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
// removed entity import session.entity';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
// removed entity import oauth-provider.entity';
import { DataSource } from 'typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';
import { AuthStrategy } from '../enums/auth-type.enum';
import { IdentifierType } from '../enums/identifier-type.enum';
import { JwtService } from '@nestjs/jwt';
import { CurrentAuth } from '../decorator/current-user.decorator';
import { AuthContextService } from '../core/auth-context.resolver';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn().mockImplementation(dto => dto),
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

describe('Login verification flow', () => {
    let service: AuthService;
        const mockPasswordStrategy = {
        login: jest.fn().mockResolvedValue({
            auth: { uid: 'user-1', id: 'auth-1', isActive: true } as any,
            identifier: { isVerified: true, type: IdentifierType.EMAIL, value: 'test@example.com' } as any,
        }),
    };
    const mockDataSource = {
        transaction: jest.fn(),
    };
    const mockJwtService = {
        signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    const mockCookieService = {
        get: jest.fn().mockReturnValue({
            accessTokenName: 'root_access_token',
            refreshTokenName: 'root_refresh_token',
        }),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                AuthModule.register({
                    jwtSecret: 'test',
                    jwtRefreshSecret: 'test-refresh',
                    verificationRequired: true,
                    enabledStrategies: [AuthStrategy.EMAIL],
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
                { provide: DataSource, useValue: mockDataSource },
                { provide: JwtService, useValue: mockJwtService },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ]
        })
            .overrideProvider(AUTH_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(AUTH_IDENTIFIER_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(AUTH_OTP_PROVIDER).useValue(mockRepo)
            .overrideProvider(MFA_METHOD_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(SESSION_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(OAUTH_PROVIDER_REPOSITORY_TOKEN).useValue(mockRepo)
            .overrideProvider(LocalAuthStrategy).useValue(mockPasswordStrategy)
            .overrideProvider(GoogleAuthStrategy).useValue({})
            .overrideProvider(AppleAuthStrategy).useValue({})
            .overrideProvider(FacebookAuthStrategy).useValue({})
            .overrideProvider(AuthContextService).useValue(mockCookieService)
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should login without triggering verification when identifier is already verified', async () => {
        const result = await service.login({ dto: { method: AuthStrategy.EMAIL, email: 'test@example.com', password: 'pwd' } }) as any;
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.auth).toBeDefined();
        expect(result.verificationRequired).toBeUndefined();
    });
});
