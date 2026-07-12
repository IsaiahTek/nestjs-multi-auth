import { IdentifierType } from '../enums/identifier-type.enum';
import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { DataSource } from 'typeorm';
// removed entity import auth.entity';
// removed entity import auth-identify.entity';
// removed entity import oauth-provider.entity';
// removed entity import session.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AuthStrategy, OAuthProviderType } from '../enums/auth-type.enum';
import { AuthController } from '../auth.controller';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthContextService } from '../core/auth-context.resolver';


const createMockRepo = () => ({
    findOne: jest.fn(),
        findByProviderUserId: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
    findByUidAndEnabled: jest.fn(),
    findByValue: jest.fn(),
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

describe('Account Linking Integration', () => {
    let authService: AuthService;
    let localStrategy: LocalAuthStrategy;
    let googleStrategy: GoogleAuthStrategy;
    let facebookStrategy: FacebookAuthStrategy;
    let appleStrategy: AppleAuthStrategy;
    let controller: AuthController;
    let authCookieService: AuthContextService;

    const mockDataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => cb({
            getRepository: (entity: any) => {
                if (entity === AUTH_REPOSITORY_TOKEN) return mockAuthRepo;
                if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return mockIdentifierRepo;
                if (entity === OAUTH_PROVIDER_REPOSITORY_TOKEN) return mockOAuthProviderRepo;
                return {};
            }
        })),
    };

    const mockCookieService = {
        get: jest.fn().mockReturnValue({
            accessTokenName: 'root_access_token',
            refreshTokenName: 'root_refresh_token',
        }),
        getNamespace: jest.fn().mockReturnValue(undefined)
    };

    const mockAuthRepo: any = { ...createMockRepo(), create: jest.fn().mockImplementation(v => v || {}), save: jest.fn().mockImplementation(async v => v) };

    const mockIdentifierRepo: any = { ...createMockRepo(), create: jest.fn().mockImplementation(v => v || {}), save: jest.fn().mockImplementation(async v => v) };

    const mockOAuthProviderRepo = {
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockImplementation(async (d) => d),
        findOne: jest.fn(),
        findByProviderUserId: jest.fn(),
    };

    const mockSessionRepo: any = {
        ...createMockRepo(),
        create: jest.fn().mockImplementation((v) => ({ id: 'session-123', ...v })),
        save: jest.fn().mockImplementation(async (v) => v),
    };

    const mockOtpProvider: any = createMockRepo();

    const mockMfaRepo: any = createMockRepo();

    const mockJwtService = {
        signAsync: jest.fn().mockResolvedValue('token'),
    };

    const mockOptions = {
        enabledStrategies: Object.values(AuthStrategy),
        jwtSecret: 'test-secret',
        transport: 'BEARER',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                AuthService,
                LocalAuthStrategy,
                OAuthAuthStrategy,
                GoogleAuthStrategy,
                FacebookAuthStrategy,
                AppleAuthStrategy,
                { provide: DataSource, useValue: mockDataSource },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: mockAuthRepo },
                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockIdentifierRepo },
                { provide: OAUTH_PROVIDER_REPOSITORY_TOKEN, useValue: mockOAuthProviderRepo },
                { provide: SESSION_REPOSITORY_TOKEN, useValue: mockSessionRepo },
                { provide: AUTH_OTP_PROVIDER, useValue: mockOtpProvider },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: mockOtpProvider },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: mockOtpProvider },
                { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: mockMfaRepo },
                { provide: JwtService, useValue: mockJwtService },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
                { provide: AuthContextService, useValue: mockCookieService },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
        })
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        authService = module.get<AuthService>(AuthService);
        localStrategy = module.get<LocalAuthStrategy>(LocalAuthStrategy);
        googleStrategy = module.get<GoogleAuthStrategy>(GoogleAuthStrategy);
        facebookStrategy = module.get<FacebookAuthStrategy>(FacebookAuthStrategy);
        appleStrategy = module.get<AppleAuthStrategy>(AppleAuthStrategy);
        controller = module.get<AuthController>(AuthController);
        authCookieService = module.get<AuthContextService>(AuthContextService);
        // Mock verifyIdToken for Google
        (googleStrategy as any).client = {
            verifyIdToken: jest.fn().mockResolvedValue({
                getPayload: () => ({
                    sub: 'google-uid-123',
                    email: 'google@example.com',
                    email_verified: true,
                    name: 'Google User',
                }),
            }),
        };

        // Mock Facebook/Apple if they have specific verification logic
        (facebookStrategy as any).verifyToken = jest.fn().mockResolvedValue({
            id: 'fb-uid-123',
            email: 'fb@example.com',
            name: 'FB User',
        });
        (appleStrategy as any).verifyToken = jest.fn().mockResolvedValue({
            sub: 'apple-uid-123',
            email: 'apple@example.com',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Linking via each strategy', () => {
        const existingUid = 'existing-user-uuid';

        it('should link EMAIL strategy to existing UID', async () => {
            const dto = {
                method: AuthStrategy.EMAIL,
                email: 'new-email@example.com',
                password: 'password123'
            };
            mockIdentifierRepo.findByValue.mockResolvedValue(null);

            const result = await authService.signup({ dto, uid: existingUid });

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: existingUid,
                strategy: AuthStrategy.EMAIL,
            }));
            expect(result.auth.uid).toBe(existingUid);
        });

        it('should link PHONE strategy to existing UID', async () => {
            const dto = {
                method: AuthStrategy.PHONE,
                phone: '+1234567890',
                password: 'password123'
            };
            mockIdentifierRepo.findByValue.mockResolvedValue(null);

            const result = await authService.signup({ dto, uid: existingUid });

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: existingUid,
                strategy: AuthStrategy.PHONE,
            }));
            expect(result.auth.uid).toBe(existingUid);
        });

        it('should link USERNAME strategy to existing UID', async () => {
            const dto = {
                method: AuthStrategy.USERNAME,
                username: 'newuser',
                password: 'password123'
            };
            mockIdentifierRepo.findByValue.mockResolvedValue(null);

            const result = await authService.signup({ dto, uid: existingUid });

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: existingUid,
                strategy: AuthStrategy.USERNAME,
            }));
            expect(result.auth.uid).toBe(existingUid);
        });

        it('should link GOOGLE strategy to existing UID', async () => {
            const dto = {
                method: AuthStrategy.GOOGLE,
                provider: OAuthProviderType.GOOGLE,
                token: 'mock-google-token'
            };
            mockOAuthProviderRepo.findByProviderUserId.mockResolvedValue(null);
            mockIdentifierRepo.findByValue.mockResolvedValue(null);

            const result = await authService.signup({ dto, uid: existingUid });

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: existingUid,
                strategy: AuthStrategy.OAUTH,
            }));
            expect(result.auth.uid).toBe(existingUid);
        });

        it('should link FACEBOOK strategy to existing UID', async () => {
            const dto = {
                method: AuthStrategy.FACEBOOK,
                provider: OAuthProviderType.FACEBOOK,
                token: 'mock-fb-token'
            };
            mockOAuthProviderRepo.findByProviderUserId.mockResolvedValue(null);
            mockIdentifierRepo.findByValue.mockResolvedValue(null);

            const result = await authService.signup({ dto, uid: existingUid });

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: existingUid,
                strategy: AuthStrategy.OAUTH,
            }));
            expect(result.auth.uid).toBe(existingUid);
        });

        it('should link APPLE strategy to existing UID', async () => {
            const dto = {
                method: AuthStrategy.APPLE,
                provider: OAuthProviderType.APPLE,
                token: 'mock-apple-token'
            };
            mockOAuthProviderRepo.findByProviderUserId.mockResolvedValue(null);
            mockIdentifierRepo.findByValue.mockResolvedValue(null);

            const result = await authService.signup({ dto, uid: existingUid });

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: existingUid,
                strategy: AuthStrategy.OAUTH,
            }));
            expect(result.auth.uid).toBe(existingUid);
        });
    });

    describe('Linking error cases', () => {
        const existingUid = 'existing-user-uuid';

        it('should fail if identifier (email) is already in use by another account', async () => {
            const dto = {
                method: AuthStrategy.EMAIL,
                email: 'already@taken.com',
                password: 'password123'
            };
            mockIdentifierRepo.findByValue.mockResolvedValue({
                id: 'existing-id',
                value: 'already@taken.com',
                type: IdentifierType.EMAIL
            });

            await expect(authService.signup({ dto, uid: existingUid })).rejects.toThrow(/already exists|taken|Unable to signup/);
        });

        it('should fail if OAuth account is already linked to another account', async () => {
            const dto = {
                method: AuthStrategy.GOOGLE,
                provider: OAuthProviderType.GOOGLE,
                token: 'mock-google-token'
            };
            mockOAuthProviderRepo.findByProviderUserId.mockResolvedValue({ id: 'existing-provider-id', providerUserId: 'google-uid-123' });

            await expect(authService.signup({ dto, uid: existingUid })).rejects.toThrow(/already linked/);
        });
    });

    describe('AuthController Linking', () => {
        const mockRequest = {
            user: { uid: 'user-123' },
            headers: { 'user-agent': 'test-agent' },
            ip: '127.0.0.1',
            originalUrl: '/auth/link',
        } as any;

        const mockResponse = {
            cookie: jest.fn(),
        } as unknown as Response;

        it('should call authService.signup with existing UID when link is called', async () => {
            const dto = {
                method: AuthStrategy.GOOGLE,
                provider: OAuthProviderType.GOOGLE,
                token: 'token'
            };
            mockIdentifierRepo.findByValue.mockResolvedValue(null);
            mockOAuthProviderRepo.findByProviderUserId.mockResolvedValue(null);

            const result = await controller.link(dto as any, mockRequest, mockResponse);

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: 'user-123',
            }));
            expect(result.auth).toBeDefined();
        });
    });
});
