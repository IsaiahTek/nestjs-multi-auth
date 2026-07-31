import { IdentifierType } from '../enums/identifier-type.enum';
import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
// removed entity import auth.entity';
// removed entity import auth-identify.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
// removed entity import session.entity';
import { DataSource } from 'typeorm';
import { AuthStrategy } from '../enums/auth-type.enum';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER } from '../interfaces/auth-notification-provider.interface';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
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

describe('Reproduction: Phone login without password', () => {
    let service: AuthService;
    let mockNotificationProvider: any;

    
    const mockPasswordStrategy = {
        login: jest.fn(),
    };

    const mockJwtService = {
        signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    beforeEach(async () => {
        mockNotificationProvider = {
            sendVerificationCode: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: LocalAuthStrategy, useValue: mockPasswordStrategy },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: AUTH_OTP_PROVIDER, useValue: mockRepo },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: mockRepo },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: mockRepo },
                { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: SESSION_REPOSITORY_TOKEN, useValue: mockRepo },
                { provide: JwtService, useValue: mockJwtService },
                { provide: AUTH_MODULE_OPTIONS, useValue: { jwtSecret: 'test' } },
                { provide: AUTH_NOTIFICATION_PROVIDER, useValue: mockNotificationProvider },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ]
        }).compile();

        service = module.get<AuthService>(AuthService);

        // Mock the auth and identifier lookup in strategy
        mockPasswordStrategy.login.mockResolvedValue({
            auth: { uid: 'user-1', id: 'auth-1', strategy: AuthStrategy.PHONE, isActive: true } as any,
            identifier: { isVerified: true, type: IdentifierType.PHONE, value: '+1234567890' } as any
        });

        // Mock AuthService lookup for primary identifier
        mockRepo.query.mockResolvedValue([{ type: 'PHONE', value: '+1234567890', isVerified: true }]);
        mockRepo.issue.mockResolvedValue({ handledDelivery: false, code: '123456', expiresAt: new Date() });
    });

    it('should trigger verification for phone login without password', async () => {
        const result = await service.login({
            dto: {
                method: AuthStrategy.PHONE,
                phone: '+1234567890',
            }
        }) as any;

        // If it's working as expected (triggering verification), tokens should be undefined
        expect(result.verificationRequired).toBe(true);
        expect(result.tokens).toBeUndefined();
        expect(mockNotificationProvider.sendVerificationCode).toHaveBeenCalled();
    });
});
