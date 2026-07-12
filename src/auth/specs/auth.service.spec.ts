import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
// removed entity import session.entity';
// removed entity import auth.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AuthStrategy } from '../enums/auth-type.enum';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
// removed entity import session_log.entity';


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
    findByStrategyAndValue: jest.fn(),
    markVerifiedByAuthId: jest.fn(),
});

let mockRepo: any = createMockRepo();

describe('AuthService', () => {
    let service: AuthService;

    const mockJwtService = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
        decode: jest.fn(),
    };

    const mockPasswordStrategy = {
        login: jest.fn(),
        registerCredentials: jest.fn(),
    };

    const mockOAuthStrategy = {
        login: jest.fn(),
        registerCredentials: jest.fn(),
    };

    const mockIdentifierRepo: any = createMockRepo();

    const mockAuthRepo: any = createMockRepo();

    const mockOtpProvider: any = createMockRepo();

    const mockMfaRepo: any = createMockRepo();

    const mockOptions = {
        jwtSecret: 'test-secret',
    };

    const mockSessionRepo: any = createMockRepo();

    const mockSessionLogRepo: any = createMockRepo();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: LocalAuthStrategy, useValue: mockPasswordStrategy },
                { provide: OAuthAuthStrategy, useValue: mockOAuthStrategy },
                { provide: SESSION_REPOSITORY_TOKEN, useValue: mockSessionRepo },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: mockAuthRepo },
                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockIdentifierRepo },
                { provide: AUTH_OTP_PROVIDER, useValue: mockOtpProvider },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: mockOtpProvider },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: mockOtpProvider },
                { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: mockMfaRepo },
                { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockSessionLogRepo},
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('signup', () => {
        it('should throw BadRequestException if strategy is disabled', async () => {
            const signupDto = { method: AuthStrategy.EMAIL };
            const restrictedService = new AuthService(
                mockJwtService as any,
                mockPasswordStrategy as any,
                mockOAuthStrategy as any,
                mockSessionRepo as any,
                mockSessionLogRepo as any,
                mockAuthRepo as any,
                mockIdentifierRepo as any,
                mockOtpProvider as any,
                mockOtpProvider as any, // email otp provider
                mockOtpProvider as any, // phone otp provider
                mockMfaRepo as any,
                { enabledStrategies: [AuthStrategy.LOCAL] } as any,
            
            );

            await expect(restrictedService.signup({ dto: signupDto })).rejects.toThrow(BadRequestException);
            await expect(restrictedService.signup({ dto: signupDto })).rejects.toThrow(/disabled/);
        });

        it('should throw BadRequestException if strategy provider is missing', async () => {
            const signupDto = { method: AuthStrategy.APPLE };
            const restrictedService = new AuthService(
                mockJwtService as any,
                mockPasswordStrategy as any,
                null as any, // oauthStrategy missing
                mockSessionRepo as any,
                mockSessionLogRepo as any,
                mockAuthRepo as any,
                mockIdentifierRepo as any,
                mockOtpProvider as any,
                mockOtpProvider as any, // email otp provider
                mockOtpProvider as any, // phone otp provider
                mockMfaRepo as any,
                { enabledStrategies: [AuthStrategy.APPLE] } as any,
            );

            await expect(restrictedService.signup({ dto: signupDto })).rejects.toThrow(BadRequestException);
            await expect(restrictedService.signup({ dto: signupDto })).rejects.toThrow(/not configured/);
        });
    });

    describe('resendVerification', () => {
        it('should throw BadRequestException if called within resend interval', async () => {
            const authId = 'auth-uid';
            mockAuthRepo.findByUid.mockResolvedValue({ id: 1, uid: authId, isVerified: false });
            mockOtpProvider.resend.mockRejectedValue(new BadRequestException('Please wait before requesting another code'));

            const serviceWithInterval = new AuthService(
                mockJwtService as any,
                mockPasswordStrategy as any,
                mockOAuthStrategy as any,
                mockSessionRepo as any,
                mockSessionLogRepo as any,
                mockAuthRepo as any,
                mockIdentifierRepo as any,
                mockOtpProvider as any,
                mockOtpProvider as any, // email otp provider
                mockOtpProvider as any, // phone otp provider
                mockMfaRepo as any,
                { otpResendInterval: 60 } as any, // 60 second interval
                { sendVerificationCode: jest.fn() } as any,
            );

            await expect(serviceWithInterval.resendVerification(authId)).rejects.toThrow(BadRequestException);
            await expect(serviceWithInterval.resendVerification(authId)).rejects.toThrow(/Please wait/);
        });

        it('should allow verification if a pending OTP exists even if identity is already verified', async () => {
            const uid = 'auth-uid';
            const code = '123456';
            const hash = await bcrypt.hash(code, 10);

            mockAuthRepo.findByUid.mockResolvedValue({ uid, isVerified: true });
            mockOtpProvider.verify.mockResolvedValue({ success: true, authId: 1 });
            mockSessionRepo.create.mockReturnValue({});
            mockSessionRepo.save.mockImplementation(async (session) => {
                session.id = 'session-id';
                return session;
            });
            mockJwtService.signAsync.mockResolvedValue('token');

            const result = await service.verifyCode({ uid, code });
            expect(result.message).toBe('Identity verified successfully');
        });
    });
});
