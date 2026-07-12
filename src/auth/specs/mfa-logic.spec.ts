import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
// removed entity import mfa-method.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { authenticator } from 'otplib';
import { BadRequestException } from '@nestjs/common';
// removed entity import session.entity';
// removed entity import auth.entity';
// removed entity import otp-token.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
import { DataSource } from 'typeorm';
import { MfaType } from '../enums/mfa-type.enum';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
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
    findByValue: jest.fn(),
    findByUidAndStrategies: jest.fn(),
    findByUidAndType: jest.fn(),
    findByStrategyAndValue: jest.fn()
});

let mockRepo: any = createMockRepo();

describe('AuthService MFA', () => {
    let service: AuthService;
    let mfaRepo: any;

    const mockMfaRepo: any = createMockRepo();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: mockMfaRepo },
                { provide: SESSION_REPOSITORY_TOKEN, useValue: {} },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: { findByUid: jest.fn().mockResolvedValue({ id: 'user-1' }) } }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: { findWithAuthByValue: jest.fn(), save: jest.fn() } },
                { provide: AUTH_OTP_PROVIDER, useValue: {} },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: {} },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: {} },
                { provide: AUTH_MODULE_OPTIONS, useValue: { appName: 'TestApp' } },
                { provide: JwtService, useValue: { decode: jest.fn() } },
                { provide: LocalAuthStrategy, useValue: {} },
                { provide: OAuthAuthStrategy, useValue: {} },
                { provide: DataSource, useValue: {} },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        mfaRepo = module.get(MFA_METHOD_REPOSITORY_TOKEN);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('enrollMfa', () => {
        it('should generate a new secret and return otpauth URI', async () => {
            mfaRepo.findByUidAndType.mockResolvedValue(null);
            mfaRepo.create.mockImplementation((dto: any) => dto);
            mfaRepo.save.mockImplementation((mfa: any) => Promise.resolve(mfa));

            const result = await service.enrollMfa('user-1', MfaType.TOTP);

            expect(result).toHaveProperty('secret');
            expect(result).toHaveProperty('otpauth');
            expect(result.otpauth).toContain('otpauth://totp/TestApp:user-1');
            expect(mfaRepo.create).toHaveBeenCalled();
        });

        it('should throw if MFA is already enabled', async () => {
            mfaRepo.findByUidAndType.mockResolvedValue({ isEnabled: true });

            await expect(service.enrollMfa('user-1', MfaType.TOTP)).rejects.toThrow(BadRequestException);
        });
    });

    describe('activateMfa', () => {
        it('should activate MFA if code is valid', async () => {
            const secret = authenticator.generateSecret();
            const code = authenticator.generate(secret);

            const mockMfa = { id: 'mfa-1', secret, isEnabled: false };
            mfaRepo.findByUidAndType.mockResolvedValue(mockMfa);
            mfaRepo.save.mockImplementation((mfa: any) => Promise.resolve(mfa));

            const result = await service.activateMfa('user-1', MfaType.TOTP, code);

            expect(result.message).toContain('successfully');
            expect(mockMfa.isEnabled).toBe(true);
        });

        it('should throw if code is invalid', async () => {
            mfaRepo.findByUidAndType.mockResolvedValue({ secret: 'wrong-secret', isEnabled: false });

            await expect(service.activateMfa('user-1', MfaType.TOTP, '000000')).rejects.toThrow(BadRequestException);
        });
    });

    describe('mfaLogin', () => {
        it('should return session on successful mfa login', async () => {
            const secret = authenticator.generateSecret();
            const code = authenticator.generate(secret);
            const mockMfa = { secret, isEnabled: true };
            mfaRepo.findByUidAndEnabled.mockResolvedValue(mockMfa);
            
            // Mock createSession and login
            jest.spyOn(service as any, 'createSession').mockResolvedValue({ accessToken: 'token', user: { id: 'user-1' } });
            
            const result = await service.mfaLogin('user-1', code);
            expect(result.tokens).toHaveProperty('accessToken');
        });

        it('should throw if MFA is not enabled', async () => {
            mfaRepo.findByUidAndEnabled.mockResolvedValue(null);
            
            await expect(service.mfaLogin('user-1', '000000')).rejects.toThrow('MFA is not enabled for this account');
        });
        
        it('should throw on invalid mfa code', async () => {
            mfaRepo.findByUidAndEnabled.mockResolvedValue({ secret: 'wrong-secret', isEnabled: true });
            
            await expect(service.mfaLogin('user-1', '000000')).rejects.toThrow(BadRequestException);
        });
    });
});
