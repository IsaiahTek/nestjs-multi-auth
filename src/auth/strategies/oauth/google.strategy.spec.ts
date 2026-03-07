import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAuthStrategy } from './google.strategy';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AUTH_MODULE_OPTIONS } from '../../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

jest.mock('google-auth-library');

describe('GoogleAuthStrategy', () => {
    let strategy: GoogleAuthStrategy;
    let oauthProviderRepo: any;
    let authRepo: any;

    const mockDataSource = {
        transaction: jest.fn(),
    };

    const mockAuthRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockOAuthProviderRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
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
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
            ],
        }).compile();

        strategy = module.get<GoogleAuthStrategy>(GoogleAuthStrategy);
        authRepo = mockAuthRepo;
        oauthProviderRepo = mockOAuthProviderRepo;
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
            const mockPayload = { sub: 'google-uid', email: 'test@example.com' };
            (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValue({
                getPayload: () => mockPayload,
            });

            const mockAuth = { id: 'auth-id', lastUsedAt: null };
            oauthProviderRepo.findOne.mockResolvedValue({ auth: mockAuth });

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
