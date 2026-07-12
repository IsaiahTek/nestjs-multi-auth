import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { Test, TestingModule } from '@nestjs/testing';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';
import { DataSource, Repository } from 'typeorm';
// removed entity import auth.entity';
// removed entity import oauth-provider.entity';
// removed entity import auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProviderUserId: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
    findByValue: jest.fn(),
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

// Mock the global fetch
global.fetch = jest.fn();

describe('FacebookAuthStrategy', () => {
    let strategy: FacebookAuthStrategy;
    let authRepo: any = createMockRepo();
    let oauthProviderRepo: any = createMockRepo();
    let identifierRepo: any = createMockRepo();
    let dataSource: DataSource;

    const mockOptions = {
        facebookAppId: 'test-app-id',
        facebookAppSecret: 'test-app-secret',
    };

    const mockQueryRunner = {
        manager: {
            getRepository: jest.fn().mockImplementation((entity) => {
                if (entity === AUTH_REPOSITORY_TOKEN) return authRepo;
                if (entity === OAUTH_PROVIDER_REPOSITORY_TOKEN) return oauthProviderRepo;
                if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return identifierRepo;
            }),
        },
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FacebookAuthStrategy,
                {
                    provide: DataSource,
                    useValue: {
                        transaction: jest.fn().mockImplementation((cb) => cb(mockQueryRunner.manager)),
                    },
                },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: OAUTH_PROVIDER_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
        }).compile();

        strategy = module.get<FacebookAuthStrategy>(FacebookAuthStrategy);
        authRepo = module.get(AUTH_REPOSITORY_TOKEN);
        oauthProviderRepo = module.get(OAUTH_PROVIDER_REPOSITORY_TOKEN);
        identifierRepo = module.get(AUTH_IDENTIFIER_REPOSITORY_TOKEN);
        dataSource = module.get(DataSource);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyToken', () => {
        it('should throw BadRequestException on Facebook API error', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: { message: 'Invalid token' } }),
            });

            await expect(strategy.login({ token: 'bad-token' } as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('registerCredentials', () => {
        it('should successfully register a new Facebook user', async () => {
            const mockPayload = { id: 'fb-123', email: 'test@fb.com' };
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockPayload),
            });

            (oauthProviderRepo.findByProviderUserId as jest.Mock).mockResolvedValue(null);
            (identifierRepo.findByValue as jest.Mock).mockResolvedValue(null);
            (authRepo.create as jest.Mock).mockReturnValue({ id: 'auth-1' });
            (authRepo.save as jest.Mock).mockImplementation((auth) => Promise.resolve(auth));

            const result = await strategy.registerCredentials({ token: 'valid-token' } as any);

            expect(result).toHaveProperty('auth');
            expect(authRepo.create).toHaveBeenCalledWith(expect.objectContaining({ isVerified: true }));
        });
    });

    describe('login', () => {
        it('should successfully login an existing Facebook user', async () => {
            const mockPayload = { id: 'fb-123', email: 'test@fb.com' };
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockPayload),
            });

            const mockAuth = { id: 'auth-1', identifiers: [{ value: 'test@fb.com' }] };
            (oauthProviderRepo.findWithAuthByProviderUserId as jest.Mock).mockResolvedValue({ auth: mockAuth, provider: {} });

            const result = await strategy.login({ token: 'valid-token' } as any);

            expect(result.auth).toEqual(mockAuth);
            expect(authRepo.save).toHaveBeenCalled();
        });
    });
});
