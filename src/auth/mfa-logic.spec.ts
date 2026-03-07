import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MfaMethod, MfaType } from './entities/mfa-method.entity';
import { AUTH_MODULE_OPTIONS } from './interfaces/auth-module-options.interface';
import { authenticator } from 'otplib';
import { BadRequestException } from '@nestjs/common';
import { Session } from './entities/session.entity';
import { Auth } from './entities/auth.entity';
import { OtpToken } from './entities/otp-token.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { DataSource } from 'typeorm';

describe('AuthService MFA', () => {
    let service: AuthService;
    let mfaRepo: any;

    const mockMfaRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(MfaMethod), useValue: mockMfaRepo },
                { provide: getRepositoryToken(Session), useValue: {} },
                { provide: getRepositoryToken(Auth), useValue: {} },
                { provide: getRepositoryToken(OtpToken), useValue: {} },
                { provide: AUTH_MODULE_OPTIONS, useValue: { appName: 'TestApp' } },
                { provide: JwtService, useValue: { decode: jest.fn() } },
                { provide: LocalAuthStrategy, useValue: {} },
                { provide: OAuthAuthStrategy, useValue: {} },
                { provide: DataSource, useValue: {} },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        mfaRepo = module.get(getRepositoryToken(MfaMethod));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('enrollMfa', () => {
        it('should generate a new secret and return otpauth URI', async () => {
            mfaRepo.findOne.mockResolvedValue(null);
            mfaRepo.create.mockImplementation((dto: any) => dto);
            mfaRepo.save.mockImplementation((mfa: any) => Promise.resolve(mfa));

            const result = await service.enrollMfa('user-1', MfaType.TOTP);

            expect(result).toHaveProperty('secret');
            expect(result).toHaveProperty('otpauth');
            expect(result.otpauth).toContain('otpauth://totp/TestApp:user-1');
            expect(mfaRepo.create).toHaveBeenCalled();
        });

        it('should throw if MFA is already enabled', async () => {
            mfaRepo.findOne.mockResolvedValue({ isEnabled: true });

            await expect(service.enrollMfa('user-1', MfaType.TOTP)).rejects.toThrow(BadRequestException);
        });
    });

    describe('activateMfa', () => {
        it('should activate MFA if code is valid', async () => {
            const secret = authenticator.generateSecret();
            const code = authenticator.generate(secret);

            const mockMfa = { id: 'mfa-1', secret, isEnabled: false };
            mfaRepo.findOne.mockResolvedValue(mockMfa);
            mfaRepo.save.mockImplementation((mfa: any) => Promise.resolve(mfa));

            const result = await service.activateMfa('user-1', MfaType.TOTP, code);

            expect(result.message).toContain('successfully');
            expect(mockMfa.isEnabled).toBe(true);
        });

        it('should throw if code is invalid', async () => {
            mfaRepo.findOne.mockResolvedValue({ secret: 'wrong-secret', isEnabled: false });

            await expect(service.activateMfa('user-1', MfaType.TOTP, '000000')).rejects.toThrow(BadRequestException);
        });
    });
});
