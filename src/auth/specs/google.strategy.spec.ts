import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { DataSource } from 'typeorm';
// removed entity import auth.entity';
// removed entity import oauth-provider.entity';
// removed entity import auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';


const createMockRepo = () => ({
    findOne: jest.fn(),
        findWithAuthByValue: jest.fn(),
        findByValue: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProviderUserId: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithIdentifiers: jest.fn(),
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

jest.mock('google-auth-library');

describe('GoogleAuthStrategy', () => {
    let strategy: GoogleAuthStrategy;
    let oauthProviderRepo: any = createMockRepo();
    let authRepo: any = createMockRepo();
    let authIdentifierRepo: any;

    const mockAuthRepo: any = createMockRepo();

    const mockOAuthProviderRepo = {
        create: jest.fn().mockImplementation((val) => val),
        save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        findOne: jest.fn(),
        findWithAuthByProviderUserId: jest.fn(),
        findByProviderUserId: jest.fn(),
    };

    const mockAuthIdentifierRepo = {
        create: jest.fn().mockImplementation((val) => val),
        save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        findOne: jest.fn(),
        findWithAuthByValue: jest.fn(),
    };

    const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === AUTH_REPOSITORY_TOKEN) return mockAuthRepo;
            if (entity === OAUTH_PROVIDER_REPOSITORY_TOKEN) return mockOAuthProviderRepo;
            if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return mockAuthIdentifierRepo;
        }),
        save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };

    const mockDataSource = {
        transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
    };

    const mockOptions = {
        googleClientId: 'test-client-id',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleAuthStrategy,
                { provide: DataSource, useValue: mockDataSource },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: mockAuthRepo }, { provide: 'AUTH_OTP_PROVIDER', useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } },
                { provide: OAUTH_PROVIDER_REPOSITORY_TOKEN, useValue: mockOAuthProviderRepo },
                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockAuthIdentifierRepo },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
        }).compile();

        strategy = module.get<GoogleAuthStrategy>(GoogleAuthStrategy);
        authRepo = mockAuthRepo;
        oauthProviderRepo = mockOAuthProviderRepo;
        authIdentifierRepo = mockAuthIdentifierRepo;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('login', () => {
        it('should throw BadRequestException if token is missing', async () => {
            await expect(strategy.login({ method: 'google', token: '' } as any)).rejects.toThrow(BadRequestException);
        });

        it('should login successfully if account exists', async () => {
            const mockPayload = { sub: 'google-uid', email: 'test@example.com', email_verified: true, name: 'Test User', picture: 'pic-url', exp: 12345 };
            (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValue({
                getPayload: () => mockPayload,
            });

            const mockAuth = { id: 'auth-id', lastUsedAt: null, identifiers: [{ type: 'EMAIL', value: 'test@example.com' }] };
            oauthProviderRepo.findWithAuthByProviderUserId.mockResolvedValue({ auth: mockAuth, provider: {} });
            authRepo.findOne.mockResolvedValue(mockAuth);

            const result = await strategy.login({ method: 'google', token: 'valid-token' } as any);

            expect(result.auth).toBe(mockAuth);
            expect(authRepo.save).toHaveBeenCalled();
        });

        it('should throw if no account found', async () => {
            (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValue({
                getPayload: () => ({ sub: 'google-uid' }),
            });
            oauthProviderRepo.findWithAuthByProviderUserId.mockResolvedValue(null);

            await expect(strategy.login({ method: 'google', token: 'valid-token' } as any)).rejects.toThrow(BadRequestException);
        });
    });
});
