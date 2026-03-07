import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { AuthIdentifier, IdentifierType } from './entities/auth-identify.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { Session } from './entities/session.entity';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { DataSource } from 'typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GoogleAuthStrategy } from './strategies/oauth/google.strategy';
import { AppleAuthStrategy } from './strategies/oauth/apple.strategy';
import { FacebookAuthStrategy } from './strategies/oauth/facebook.strategy';
import { AuthStrategy } from './auth-type.enum';
import { JwtService } from '@nestjs/jwt';

describe('Login verification flow', () => {
    let service: AuthService;
    const mockRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(dto => ({ ...dto })),
        save: jest.fn().mockImplementation(dto => Promise.resolve({ ...dto, id: 'mock-id' })),
        delete: jest.fn(),
        query: jest.fn(),
    };
    const mockPasswordStrategy = {
        login: jest.fn().mockResolvedValue({
            auth: { uid: 'user-1', id: 'auth-1' } as any,
            identifier: { isVerified: true, type: IdentifierType.EMAIL, value: 'test@example.com' } as any,
        }),
    };
    const mockDataSource = {
        transaction: jest.fn(),
    };
    const mockJwtService = {
        signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                AuthModule.register({
                    jwtSecret: 'test',
                    jwtRefreshSecret: 'test-refresh',
                    verificationRequired: true,
                    enabledStrategies: [AuthStrategy.EMAIL],
                }),
            ],
            providers: [
                { provide: DataSource, useValue: mockDataSource },
                { provide: JwtService, useValue: mockJwtService },
            ]
        })
            .overrideProvider(getRepositoryToken(Auth)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(AuthIdentifier)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OtpToken)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(MfaMethod)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(Session)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OAuthProvider)).useValue(mockRepo)
            .overrideProvider(LocalAuthStrategy).useValue(mockPasswordStrategy)
            .overrideProvider(GoogleAuthStrategy).useValue({})
            .overrideProvider(AppleAuthStrategy).useValue({})
            .overrideProvider(FacebookAuthStrategy).useValue({})
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should login without triggering verification when identifier is already verified', async () => {
        const result = await service.login({ method: AuthStrategy.EMAIL, email: 'test@example.com', password: 'pwd' } as any) as any;
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.auth).toBeDefined();
        expect(result.verificationRequired).toBeUndefined();
    });
});
