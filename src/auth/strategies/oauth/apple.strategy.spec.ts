import { Test, TestingModule } from '@nestjs/testing';
import { AppleAuthStrategy } from './apple.strategy';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier } from '../../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

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
    let authRepo: Repository<Auth>;
    let oauthProviderRepo: Repository<OAuthProvider>;
    let identifierRepo: Repository<AuthIdentifier>;

    const mockOptions = {
        appleClientId: 'test-client-id',
    };

    const mockQueryRunner = {
        manager: {
            getRepository: jest.fn().mockImplementation((entity) => {
                if (entity === Auth) return authRepo;
                if (entity === OAuthProvider) return oauthProviderRepo;
                if (entity === AuthIdentifier) return identifierRepo;
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
                { provide: getRepositoryToken(Auth), useValue: { create: jest.fn(), save: jest.fn() } },
                { provide: getRepositoryToken(OAuthProvider), useValue: { findOne: jest.fn(), create: jest.fn() } },
                { provide: getRepositoryToken(AuthIdentifier), useValue: { findOne: jest.fn(), create: jest.fn() } },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
            ],
        }).compile();

        strategy = module.get<AppleAuthStrategy>(AppleAuthStrategy);
        authRepo = module.get(getRepositoryToken(Auth));
        oauthProviderRepo = module.get(getRepositoryToken(OAuthProvider));
        identifierRepo = module.get(getRepositoryToken(AuthIdentifier));
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

            (oauthProviderRepo.findOne as jest.Mock).mockResolvedValue(null);
            (identifierRepo.findOne as jest.Mock).mockResolvedValue(null);
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
            (oauthProviderRepo.findOne as jest.Mock).mockResolvedValue({ auth: mockAuth });

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

            (oauthProviderRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(strategy.login({ token: 'valid-token' } as any)).rejects.toThrow(BadRequestException);
        });
    });
});
