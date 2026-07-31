import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { Test, TestingModule } from '@nestjs/testing';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { DataSource, Repository } from 'typeorm';
// removed entity import auth.entity';
// removed entity import oauth-provider.entity';
// removed entity import auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';


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

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

// Mock crypto
jest.mock('crypto', () => ({
    ...jest.requireActual('crypto'),
    createPublicKey: jest.fn(),
    randomUUID: jest.fn().mockReturnValue('random-uuid'),
}));

describe('AppleAuthStrategy', () => {
    let strategy: AppleAuthStrategy;
    let authRepo: any = createMockRepo();
    let oauthProviderRepo: any = createMockRepo();
    let identifierRepo: any = createMockRepo();

    const mockOptions = {
        appleClientId: 'test-client-id',
    };

    const mockQueryRunner = {
        manager: {
            getRepository: jest.fn().mockImplementation((entity) => {
                if (entity === AUTH_REPOSITORY_TOKEN) return authRepo;
                if (entity === OAUTH_PROVIDER_REPOSITORY_TOKEN) return oauthProviderRepo;
                if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return identifierRepo;
            }),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppleAuthStrategy,
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

        strategy = module.get<AppleAuthStrategy>(AppleAuthStrategy);
        authRepo = module.get(AUTH_REPOSITORY_TOKEN);
        oauthProviderRepo = module.get(OAUTH_PROVIDER_REPOSITORY_TOKEN);
        identifierRepo = module.get(AUTH_IDENTIFIER_REPOSITORY_TOKEN);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('registerCredentials', () => {
        it('should successfully register a new Apple user', async () => {
            const mockPayload = { sub: 'apple-123', email: 'test@apple.com', email_verified: 'true' };
            const mockToken = 'valid-token';

            (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ keys: [{ kid: 'key-id', kty: 'RSA' }] }),
            });
            (crypto.createPublicKey as jest.Mock).mockReturnValue('public-key');
            (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

            (oauthProviderRepo.findByProviderUserId as jest.Mock).mockResolvedValue(null);
            (identifierRepo.findByValue as jest.Mock).mockResolvedValue(null);
            (authRepo.create as jest.Mock).mockReturnValue({ id: 'auth-1' });
            (authRepo.save as jest.Mock).mockImplementation((auth) => Promise.resolve(auth));

            const result = await strategy.registerCredentials({ token: mockToken } as any);

            expect(result).toHaveProperty('auth');
            expect(authRepo.create).toHaveBeenCalledWith(expect.objectContaining({ isVerified: true }));
        });
    });

    describe('login', () => {
        it('should successfully login an existing Apple user', async () => {
            const mockPayload = { sub: 'apple-123', email: 'test@apple.com' };
            (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ keys: [{ kid: 'key-id', kty: 'RSA' }] }),
            });
            (crypto.createPublicKey as jest.Mock).mockReturnValue('public-key');
            (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

            const mockAuth = { id: 'auth-1', identifiers: [{ value: 'test@apple.com' }] };
            (oauthProviderRepo.findWithAuthByProviderUserId as jest.Mock).mockResolvedValue({ auth: mockAuth, provider: {} });

            const result = await strategy.login({ token: 'valid-token' } as any);

            expect(result.auth).toEqual(mockAuth);
            expect(authRepo.save).toHaveBeenCalled();
        });

        it('should throw BadRequestException if no account is linked', async () => {
            const mockPayload = { sub: 'apple-123', email: 'test@apple.com' };
            (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ keys: [{ kid: 'key-id', kty: 'RSA' }] }),
            });
            (crypto.createPublicKey as jest.Mock).mockReturnValue('public-key');
            (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

            (oauthProviderRepo.findWithAuthByProviderUserId as jest.Mock).mockResolvedValue(null);

            await expect(strategy.login({ token: 'valid-token' } as any)).rejects.toThrow(BadRequestException);
        });
    });
});
