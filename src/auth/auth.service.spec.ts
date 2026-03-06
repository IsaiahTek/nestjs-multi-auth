import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { Auth } from './entities/auth.entity';
import { OtpToken } from './entities/otp-token.entity';
import { AUTH_MODULE_OPTIONS } from './interfaces/auth-module-options.interface';
import { AuthStrategy } from './auth-type.enum';
import { BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
    let service: AuthService;

    const mockJwtService = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
    };

    const mockPasswordStrategy = {
        login: jest.fn(),
        signup: jest.fn(),
    };

    const mockOAuthStrategy = {
        login: jest.fn(),
        registerCredentials: jest.fn(),
    };


    const mockAuthRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockOtpRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
    };

    const mockOptions = {
        jwtSecret: 'test-secret',
    };

    const mockSessionRepo = {
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn(),
        delete: jest.fn(),
    };

    const mockAuthUserService = {
        findById: jest.fn(),
        create: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: LocalAuthStrategy, useValue: mockPasswordStrategy },
                { provide: OAuthAuthStrategy, useValue: mockOAuthStrategy },
                { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
                { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
                { provide: getRepositoryToken(OtpToken), useValue: mockOtpRepo },
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
                mockAuthRepo as any,
                mockOtpRepo as any,
                { enabledStrategies: [AuthStrategy.LOCAL] } as any,
            );

            await expect(restrictedService.signup(signupDto as any)).rejects.toThrow(BadRequestException);
            await expect(restrictedService.signup(signupDto as any)).rejects.toThrow(/disabled/);
        });

        it('should throw BadRequestException if strategy provider is missing', async () => {
            const signupDto = { method: AuthStrategy.APPLE };
            const restrictedService = new AuthService(
                mockJwtService as any,
                mockPasswordStrategy as any,
                null as any, // oauthStrategy missing
                mockSessionRepo as any,
                mockAuthRepo as any,
                mockOtpRepo as any,
                { enabledStrategies: [AuthStrategy.APPLE] } as any,
            );

            await expect(restrictedService.signup(signupDto as any)).rejects.toThrow(BadRequestException);
            await expect(restrictedService.signup(signupDto as any)).rejects.toThrow(/not configured/);
        });
    });

    describe('resendVerification', () => {
        it('should throw BadRequestException if called within resend interval', async () => {
            const authId = 'auth-uid';
            mockAuthRepo.findOne.mockResolvedValue({ id: 1, uid: authId, isVerified: false });
            mockOtpRepo.findOne.mockResolvedValue({
                createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
            });

            const serviceWithInterval = new AuthService(
                mockJwtService as any,
                mockPasswordStrategy as any,
                mockOAuthStrategy as any,
                mockSessionRepo as any,
                mockAuthRepo as any,
                mockOtpRepo as any,
                { otpResendInterval: 60 } as any, // 60 second interval
                { sendVerificationCode: jest.fn() } as any,
            );

            await expect(serviceWithInterval.resendVerification(authId)).rejects.toThrow(BadRequestException);
            await expect(serviceWithInterval.resendVerification(authId)).rejects.toThrow(/Please wait/);
        });
    });
});
