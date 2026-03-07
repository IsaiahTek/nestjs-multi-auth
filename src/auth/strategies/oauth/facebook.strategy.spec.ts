import { Test, TestingModule } from '@nestjs/testing';
import { FacebookAuthStrategy } from './facebook.strategy';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier } from '../../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';

// Mock the global fetch
global.fetch = jest.fn();

describe('FacebookAuthStrategy', () => {
    let strategy: FacebookAuthStrategy;
    let authRepo: Repository<Auth>;
    let oauthProviderRepo: Repository<OAuthProvider>;
    let identifierRepo: Repository<AuthIdentifier>;
    let dataSource: DataSource;

    const mockOptions = {
        facebookAppId: 'test-app-id',
        facebookAppSecret: 'test-app-secret',
    };

    const mockQueryRunner = {
        manager: {
            getRepository: jest.fn().mockImplementation((entity) => {
                if (entity === Auth) return authRepo;
                if (entity === OAuthProvider) return oauthProviderRepo;
                if (entity === AuthIdentifier) return identifierRepo;
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
                { provide: getRepositoryToken(Auth), useValue: { create: jest.fn(), save: jest.fn() } },
                { provide: getRepositoryToken(OAuthProvider), useValue: { findOne: jest.fn(), create: jest.fn() } },
                { provide: getRepositoryToken(AuthIdentifier), useValue: { findOne: jest.fn(), create: jest.fn() } },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
            ],
        }).compile();

        strategy = module.get<FacebookAuthStrategy>(FacebookAuthStrategy);
        authRepo = module.get(getRepositoryToken(Auth));
        oauthProviderRepo = module.get(getRepositoryToken(OAuthProvider));
        identifierRepo = module.get(getRepositoryToken(AuthIdentifier));
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

            (oauthProviderRepo.findOne as jest.Mock).mockResolvedValue(null);
            (identifierRepo.findOne as jest.Mock).mockResolvedValue(null);
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
            (oauthProviderRepo.findOne as jest.Mock).mockResolvedValue({ auth: mockAuth });

            const result = await strategy.login({ token: 'valid-token' } as any);

            expect(result.auth).toEqual(mockAuth);
            expect(authRepo.save).toHaveBeenCalled();
        });
    });
});
