import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { Session } from '../entities/session.entity';
import { OtpToken, OtpPurpose } from '../entities/otp-token.entity';
import { MfaMethod } from '../entities/mfa-method.entity';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER } from '../interfaces/auth-notification-provider.interface';
import { AuthStrategy } from '../enums/auth-type.enum';
import * as bcrypt from 'bcrypt';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AuthService - New Features', () => {
  let service: AuthService;
  let authRepo: any;
  let otpRepo: any;
  let sessionRepo: any;
  let notificationProvider: any;

  const mockAuth = {
    id: 'auth-id',
    uid: 'user-uid',
    secretHash: 'hashed-old-password',
    isActive: true,
    strategy: AuthStrategy.EMAIL,
  };

  beforeEach(async () => {
    notificationProvider = {
      sendVerificationCode: jest.fn(),
      sendPasswordChangedNotification: jest.fn(),
      sendMagicLink: jest.fn(),
    };

    authRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      query: jest.fn(),
    };

    otpRepo = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    sessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: getRepositoryToken(Auth), useValue: authRepo },
        { provide: getRepositoryToken(OtpToken), useValue: otpRepo },
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        { provide: getRepositoryToken(MfaMethod), useValue: {} },
        { provide: AUTH_MODULE_OPTIONS, useValue: { frontendUrl: 'http://localhost:3000' } },
        { provide: AUTH_NOTIFICATION_PROVIDER, useValue: notificationProvider },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('forgotPassword', () => {
    it('should send an OTP if user exists', async () => {
      authRepo.query.mockResolvedValue([{ value: 'test@test.com', uid: 'user-uid', authId: 'auth-id' }]);
      
      const result = await service.forgotPassword({ email: 'test@test.com' });
      
      expect(otpRepo.save).toHaveBeenCalled();
      expect(notificationProvider.sendVerificationCode).toHaveBeenCalled();
      expect(result.message).toContain('reset code has been sent');
    });
  });

  describe('updatePassword', () => {
    it('should update password and send notification', async () => {
      authRepo.findOne.mockResolvedValue({
        id: 'auth-id',
        uid: 'user-uid',
        secretHash: await bcrypt.hash('old-password', 10),
      });
      authRepo.query.mockResolvedValue([{ value: 'test@test.com' }]);
      
      await service.updatePassword('user-uid', {
        currentPassword: 'old-password',
        newPassword: 'new-password-123'
      }, 'iPhone', '127.0.0.1');

      expect(authRepo.save).toHaveBeenCalled();
      expect(notificationProvider.sendPasswordChangedNotification).toHaveBeenCalledWith(
        'test@test.com',
        expect.objectContaining({ ip: '127.0.0.1', userAgent: 'iPhone' })
      );
    });

    it('should throw if current password is wrong', async () => {
      authRepo.findOne.mockResolvedValue({
        secretHash: await bcrypt.hash('real-password', 10),
      });

      await expect(service.updatePassword('uid', {
        currentPassword: 'wrong-password',
        newPassword: 'new'
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('secureAccount', () => {
    it('should lock account and delete sessions', async () => {
      otpRepo.findOne.mockResolvedValue({
        codeHash: await bcrypt.hash('token-123', 10),
        expiresAt: new Date(Date.now() + 10000),
        requestUserId: 'user-uid',
        isUsed: false,
      });

      await service.secureAccount({ uid: 'user-uid', token: 'token-123' });

      expect(authRepo.update).toHaveBeenCalledWith({ uid: 'user-uid' }, { isActive: false });
      expect(sessionRepo.delete).toHaveBeenCalledWith({ uid: 'user-uid' });
    });
  });

  describe('Login check for isActive', () => {
    it('should throw ForbiddenException if account is inactive', async () => {
      // Mocking login result
      (service as any).passwordStrategy = {
          login: jest.fn().mockResolvedValue({ auth: { isActive: false }, identifier: {} })
      };

      await expect(service.login({ method: AuthStrategy.EMAIL, emailOrPhone: 'test' } as any))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
