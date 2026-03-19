import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

jest.mock('google-auth-library');

describe('GoogleAuthStrategy', () => {
    let strategy: GoogleAuthStrategy;
    let oauthProviderRepo: any;
    let authRepo: any;
    let authIdentifierRepo: any;

    const mockAuthRepo = {
        create: jest.fn().mockImplementation((val) => val),
        save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        findOne: jest.fn(),
    };

    const mockOAuthProviderRepo = {
        create: jest.fn().mockImplementation((val) => val),
        save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        findOne: jest.fn(),
    };

    const mockAuthIdentifierRepo = {
        create: jest.fn().mockImplementation((val) => val),
        save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        findOne: jest.fn(),
    };

    const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === Auth) return mockAuthRepo;
            if (entity === OAuthProvider) return mockOAuthProviderRepo;
            if (entity === AuthIdentifier) return mockAuthIdentifierRepo;
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
                { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
                { provide: getRepositoryToken(OAuthProvider), useValue: mockOAuthProviderRepo },
                { provide: getRepositoryToken(AuthIdentifier), useValue: mockAuthIdentifierRepo },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
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
            oauthProviderRepo.findOne.mockResolvedValue({ auth: mockAuth });
            authRepo.findOne.mockResolvedValue(mockAuth);

            const result = await strategy.login({ method: 'google', token: 'valid-token' } as any);

            expect(result.auth).toBe(mockAuth);
            expect(authRepo.save).toHaveBeenCalled();
        });

        it('should throw if no account found', async () => {
            (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValue({
                getPayload: () => ({ sub: 'google-uid' }),
            });
            oauthProviderRepo.findOne.mockResolvedValue(null);

            await expect(strategy.login({ method: 'google', token: 'valid-token' } as any)).rejects.toThrow(BadRequestException);
        });
    });
});
