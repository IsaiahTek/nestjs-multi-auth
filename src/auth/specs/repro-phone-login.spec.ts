import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier, IdentifierType } from '../entities/auth-identify.entity';
import { OtpToken } from '../entities/otp-token.entity';
import { MfaMethod } from '../entities/mfa-method.entity';
import { Session } from '../entities/session.entity';
import { DataSource } from 'typeorm';
import { AuthStrategy } from '../enums/auth-type.enum';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER } from '../interfaces/auth-notification-provider.interface';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';

describe('Reproduction: Phone login without password', () => {
    let service: AuthService;
    let mockNotificationProvider: any;

    const mockRepo = {
        findOne: jest.fn(),
        create: jest.fn().mockImplementation(dto => ({ ...dto })),
        save: jest.fn().mockImplementation(dto => Promise.resolve({ ...dto, id: 'mock-id' })),
        delete: jest.fn(),
        query: jest.fn(),
        update: jest.fn(),
    };

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
                { provide: getRepositoryToken(Auth), useValue: mockRepo },
                { provide: getRepositoryToken(AuthIdentifier), useValue: mockRepo },
                { provide: getRepositoryToken(OtpToken), useValue: mockRepo },
                { provide: getRepositoryToken(MfaMethod), useValue: mockRepo },
                { provide: getRepositoryToken(Session), useValue: mockRepo },
                { provide: JwtService, useValue: mockJwtService },
                { provide: AUTH_MODULE_OPTIONS, useValue: { jwtSecret: 'test' } },
                { provide: AUTH_NOTIFICATION_PROVIDER, useValue: mockNotificationProvider },
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
    });

    it('should trigger verification for phone login without password', async () => {
        const result = await service.login({
            method: AuthStrategy.PHONE,
            phone: '+1234567890',
        }) as any;

        // If it's working as expected (triggering verification), tokens should be undefined
        expect(result.verificationRequired).toBe(true);
        expect(result.tokens).toBeUndefined();
        expect(mockNotificationProvider.sendVerificationCode).toHaveBeenCalled();
    });
});
