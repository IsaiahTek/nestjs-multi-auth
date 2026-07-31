import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
// removed entity import auth.entity';
// removed entity import session.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER } from '../interfaces/auth-notification-provider.interface';
import { AuthStrategy } from '../enums/auth-type.enum';
import * as bcrypt from 'bcrypt';
import { BadRequestException, ForbiddenException } from '@nestjs/common';


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

describe('AuthService - New Features', () => {
  let service: AuthService;
  let authRepo: any = createMockRepo();
  let identifierRepo: any;
  let otpRepo: any;
  let sessionRepo: any = createMockRepo();
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
      findByUidAndStrategies: jest.fn(),
      findAllByUid: jest.fn(),
    };

    otpRepo = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn(),
      findOne: jest.fn(),
      verify: jest.fn(),
      issue: jest.fn(),
      resend: jest.fn(),
    };

    sessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByUid: jest.fn().mockResolvedValue([{ id: 'session-id' }]),
      deleteByUid: jest.fn(),
    };

    identifierRepo = { findWithAuthByValue: jest.fn(), save: jest.fn(), findByUidAndTypes: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: AUTH_REPOSITORY_TOKEN, useValue: authRepo }, 
        { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: identifierRepo },
        { provide: AUTH_OTP_PROVIDER, useValue: otpRepo },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: otpRepo },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: otpRepo },
        { provide: SESSION_REPOSITORY_TOKEN, useValue: sessionRepo },
        { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: {} },
        { provide: AUTH_MODULE_OPTIONS, useValue: { frontendUrl: 'http://localhost:3000' } },
        { provide: AUTH_NOTIFICATION_PROVIDER, useValue: notificationProvider },
        { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('forgotPassword', () => {
    it('should send an OTP if user exists', async () => {
      identifierRepo.findWithAuthByValue.mockResolvedValue({ identifier: { value: 'test@test.com', type: 'EMAIL' }, auth: { id: 'auth-id', uid: 'user-uid' } });
      authRepo.query.mockResolvedValue([{ value: 'test@test.com', uid: 'user-uid', authId: 'auth-id' }]);
      otpRepo.issue.mockResolvedValue({ handledDelivery: false, code: '123' });

      const result = await service.forgotPassword({ email: 'test@test.com' });

      expect(otpRepo.issue).toHaveBeenCalled();
      expect(notificationProvider.sendVerificationCode).toHaveBeenCalled();
      expect(result.message).toContain('reset code has been sent');
    });
  });

  describe('updatePassword', () => {
    it('should update password and send notification', async () => {
      authRepo.findByUidAndStrategies.mockResolvedValue({
        id: 'auth-id',
        uid: 'user-uid',
        secretHash: await bcrypt.hash('old-password', 10),
      });
      identifierRepo.findWithAuthByValue.mockResolvedValue({ identifier: { value: 'test@test.com', type: 'EMAIL' }, auth: { id: 'auth-id', uid: 'user-uid' } });
      authRepo.query.mockResolvedValue([{ value: 'test@test.com' }]);
      identifierRepo.findByUidAndTypes.mockResolvedValue({ value: 'test@test.com', type: 'EMAIL' });
      otpRepo.issue.mockResolvedValue({ handledDelivery: false, code: '123' });

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
      authRepo.findByUidAndStrategies.mockResolvedValue({
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

      otpRepo.verify.mockResolvedValue({ success: true, valid: true });
      authRepo.findAllByUid.mockResolvedValue([{ id: 'auth-id' }]);
      await service.secureAccount({ uid: 'user-uid', token: 'token-123' });

      expect(authRepo.update).toHaveBeenCalledWith('auth-id', { isActive: false });
      expect(sessionRepo.deleteByUid).toHaveBeenCalledWith('user-uid');
    });
  });

  describe('Login check for isActive', () => {
    it('should throw ForbiddenException if account is inactive', async () => {
      // Mocking login result
      (service as any).passwordStrategy = {
        login: jest.fn().mockResolvedValue({ auth: { isActive: false }, identifier: {} })
      };

      await expect(service.login({ dto: { method: AuthStrategy.EMAIL, emailOrPhone: 'test' } }))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
