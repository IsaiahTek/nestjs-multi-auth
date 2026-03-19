import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AuthModule } from '../auth.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';
import { OtpToken } from '../entities/otp-token.entity';
import { MfaMethod } from '../entities/mfa-method.entity';
import { Session } from '../entities/session.entity';
import { DataSource } from 'typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { GoogleAuthStrategy } from '../strategies/oauth/google.strategy';
import { AppleAuthStrategy } from '../strategies/oauth/apple.strategy';
import { FacebookAuthStrategy } from '../strategies/oauth/facebook.strategy';

describe('Throttler Integration', () => {
    let authService: AuthService;

    const mockRepo = {
        findOne: jest.fn(),
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(dto => Promise.resolve({ ...dto, id: 'mock-id' })),
        delete: jest.fn(),
    };

    const mockDataSource = {
        transaction: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                AuthModule.register({
                    jwtSecret: 'test',
                    jwtRefreshSecret: 'test-refresh',
                    throttlerLimit: 2,
                    throttlerTtl: 60,
                }),
            ],
            providers: [
                { provide: DataSource, useValue: mockDataSource },
            ]
        })
            .overrideProvider(getRepositoryToken(Auth)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OAuthProvider)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(AuthIdentifier)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OtpToken)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(MfaMethod)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(Session)).useValue(mockRepo)
            .overrideProvider(AuthService).useValue({ login: jest.fn().mockResolvedValue({ auth: {} }) })
            .overrideProvider(LocalAuthStrategy).useValue({})
            .overrideProvider(GoogleAuthStrategy).useValue({})
            .overrideProvider(AppleAuthStrategy).useValue({})
            .overrideProvider(FacebookAuthStrategy).useValue({})
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        authService = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(authService).toBeDefined();
    });
});
