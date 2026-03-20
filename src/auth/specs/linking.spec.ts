import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier, IdentifierType } from '../entities/auth-identify.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { Session } from '../entities/session.entity';
import { OtpToken } from '../entities/otp-token.entity';
import { MfaMethod } from '../entities/mfa-method.entity';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AuthStrategy, OAuthProviderType } from '../enums/auth-type.enum';
import { AuthController } from '../auth.controller';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';

describe('Account Linking Integration', () => {
    let authService: AuthService;
    let localStrategy: LocalAuthStrategy;
    let googleStrategy: GoogleAuthStrategy;
    let facebookStrategy: FacebookAuthStrategy;
    let appleStrategy: AppleAuthStrategy;
    let controller: AuthController;

    const mockDataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => cb({
            getRepository: (entity: any) => {
                if (entity === Auth) return mockAuthRepo;
                if (entity === AuthIdentifier) return mockIdentifierRepo;
                if (entity === OAuthProvider) return mockOAuthProviderRepo;
                return {};
            }
        })),
    };

    const mockAuthRepo = {
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockImplementation(async (d) => ({ id: d.id || 'new-auth-id', ...d })),
        findOne: jest.fn(),
        count: jest.fn(),
        query: jest.fn(),
        update: jest.fn(),
    };

    const mockIdentifierRepo = {
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockImplementation(async (d) => d),
        findOne: jest.fn(),
    };

    const mockOAuthProviderRepo = {
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockImplementation(async (d) => d),
        findOne: jest.fn(),
    };

    const mockSessionRepo = {
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockImplementation(async (d) => {
            if (!d.id) d.id = 'mock-session-id';
            return d;
        }),
        update: jest.fn().mockResolvedValue({}),
        findOne: jest.fn(),
        delete: jest.fn(),
    };

    const mockOtpRepo = {
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockImplementation(async (d) => d),
        findOne: jest.fn(),
    };

    const mockMfaRepo = {
        findOne: jest.fn(),
    };

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
                { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
                { provide: getRepositoryToken(AuthIdentifier), useValue: mockIdentifierRepo },
                { provide: getRepositoryToken(OAuthProvider), useValue: mockOAuthProviderRepo },
                { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
                { provide: getRepositoryToken(OtpToken), useValue: mockOtpRepo },
                { provide: getRepositoryToken(MfaMethod), useValue: mockMfaRepo },
                { provide: JwtService, useValue: mockJwtService },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
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
            mockIdentifierRepo.findOne.mockResolvedValue(null);

            const result = await authService.signup(dto as any, existingUid);

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
            mockIdentifierRepo.findOne.mockResolvedValue(null);

            const result = await authService.signup(dto as any, existingUid);

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
            mockIdentifierRepo.findOne.mockResolvedValue(null);

            const result = await authService.signup(dto as any, existingUid);

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
            mockOAuthProviderRepo.findOne.mockResolvedValue(null);
            mockIdentifierRepo.findOne.mockResolvedValue(null);

            const result = await authService.signup(dto as any, existingUid);

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
            mockOAuthProviderRepo.findOne.mockResolvedValue(null);
            mockIdentifierRepo.findOne.mockResolvedValue(null);

            const result = await authService.signup(dto as any, existingUid);

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
            mockOAuthProviderRepo.findOne.mockResolvedValue(null);
            mockIdentifierRepo.findOne.mockResolvedValue(null);

            const result = await authService.signup(dto as any, existingUid);

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
            mockIdentifierRepo.findOne.mockResolvedValue({ 
                id: 'existing-id', 
                value: 'already@taken.com',
                type: IdentifierType.EMAIL 
            });

            await expect(authService.signup(dto as any, existingUid)).rejects.toThrow(/already exists|taken|Unable to signup/);
        });

        it('should fail if OAuth account is already linked to another account', async () => {
            const dto = { 
                method: AuthStrategy.GOOGLE, 
                provider: OAuthProviderType.GOOGLE,
                token: 'mock-google-token' 
            };
            mockOAuthProviderRepo.findOne.mockResolvedValue({ id: 'existing-provider-id', providerUserId: 'google-uid-123' });

            await expect(authService.signup(dto as any, existingUid)).rejects.toThrow(/already linked/);
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
            mockIdentifierRepo.findOne.mockResolvedValue(null);
            mockOAuthProviderRepo.findOne.mockResolvedValue(null);

            const result = await controller.link(dto as any, mockRequest, mockResponse);

            expect(mockAuthRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                uid: 'user-123',
            }));
            expect(result.auth).toBeDefined();
        });
    });
});
