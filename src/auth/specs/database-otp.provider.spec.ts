import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseOtpProvider } from '../core/database-otp.provider';
import { OTP_TOKEN_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OtpPurpose } from '../enums/otp-purpose.enum';

describe('DatabaseOtpProvider', () => {
  let provider: DatabaseOtpProvider;
  let otpRepo: any;
  let options: any;

  beforeEach(async () => {
    otpRepo = {
      create: jest.fn(),
      findLatestUnusedByPurpose: jest.fn(),
      findLatestUnused: jest.fn(),
      save: jest.fn(),
    };

    options = {
      testAccounts: [],
      debugMode: false,
      defaultOtp: '123456',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseOtpProvider,
        { provide: OTP_TOKEN_REPOSITORY_TOKEN, useValue: otpRepo },
        { provide: AUTH_MODULE_OPTIONS, useValue: options },
      ],
    }).compile();

    provider = module.get<DatabaseOtpProvider>(DatabaseOtpProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('should issue a test account OTP when identifier matches', async () => {
      options.testAccounts = [{ identifier: 'test@example.com', otp: '000000' }];
      
      const result = await provider.issue({
        uid: 'user-1',
        authId: 'auth-1',
        identifier: 'test@example.com',
        identifierType: 'email',
        purpose: OtpPurpose.VERIFY_EMAIL,
      });

      expect(result.handledDelivery).toBe(true);
      expect(result.code).toBe('000000');
      expect(otpRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        identifier: 'test@example.com',
        purpose: OtpPurpose.VERIFY_EMAIL,
        requestUserId: 'user-1',
        requestAuthId: 'auth-1',
      }));
    });

    it('should issue a default OTP in debug mode', async () => {
      options.debugMode = true;
      options.defaultOtp = '111111';
      
      const result = await provider.issue({
        uid: 'user-2',
        authId: 'auth-2',
        identifier: 'debug@example.com',
        identifierType: 'email',
        purpose: OtpPurpose.VERIFY_EMAIL,
      });

      expect(result.handledDelivery).toBe(false);
      expect(result.code).toBe('111111');
      expect(otpRepo.create).toHaveBeenCalled();
    });

    it('should generate a random OTP normally', async () => {
      const result = await provider.issue({
        uid: 'user-3',
        authId: 'auth-3',
        identifier: 'normal@example.com',
        identifierType: 'email',
        purpose: OtpPurpose.VERIFY_EMAIL,
      });

      expect(result.handledDelivery).toBe(false);
      expect(result.code).not.toBe('111111');
      expect(result.code).not.toBe('000000');
      expect(result.code?.length).toBe(6);
      expect(otpRepo.create).toHaveBeenCalled();
    });
  });
});
