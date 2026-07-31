import { AUTH_REPOSITORY_TOKEN, SESSION_REPOSITORY_TOKEN, MFA_METHOD_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from '../auth.service';
import { AuthEvents } from '../enums/auth.events';
import { SignupDto } from '../dto/requests/signup.dto';
import { AuthStrategy } from '../enums/auth-type.enum';
// removed entity import session.entity';
// removed entity import auth.entity';
// removed entity import otp-token.entity';
// removed entity import mfa-method.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn().mockImplementation(dto => dto),
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
    findByStrategyAndValue: jest.fn()
});

let mockRepo: any = createMockRepo();

describe('AuthService Events', () => {
  let service: AuthService;
  let eventEmitter: EventEmitter2;

  
  const mockPasswordStrategy = {
    registerCredentials: jest.fn().mockResolvedValue({
      auth: { uid: 'user-1', id: 'auth-1' },
      identifier: { value: 'test@example.com', type: 'EMAIL', isVerified: true },
    }),
    login: jest.fn().mockResolvedValue({
      auth: { uid: 'user-1', id: 'auth-1', isActive: true },
      identifier: { value: 'test@example.com', type: 'EMAIL', isVerified: true },
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token'),
          },
        },
        { provide: SESSION_REPOSITORY_TOKEN, useValue: mockRepo },
        { provide: AUTH_REPOSITORY_TOKEN, useValue: mockRepo }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: { findWithAuthByValue: jest.fn(), save: jest.fn() } },
        { provide: AUTH_OTP_PROVIDER, useValue: mockRepo },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: mockRepo },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: mockRepo },
        { provide: MFA_METHOD_REPOSITORY_TOKEN, useValue: mockRepo },
        { provide: LocalAuthStrategy, useValue: mockPasswordStrategy },
        { provide: OAuthAuthStrategy, useValue: {} },
        {
          provide: AUTH_MODULE_OPTIONS,
          useValue: {
            enabledStrategies: [AuthStrategy.EMAIL],
            jwtSecret: 'secret',
          },
        },
        { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should emit SIGNUP event on successful signup', async () => {
    const emitSpy = jest.spyOn(eventEmitter, 'emit');
    const dto: SignupDto = { method: AuthStrategy.EMAIL, email: 'test@example.com', password: 'password' };

    await service.signup({ dto });

    expect(emitSpy).toHaveBeenCalledWith(
      AuthEvents.SIGNUP,
      expect.objectContaining({
        auth: expect.objectContaining({ uid: 'user-1' }),
      })
    );
  });

  it('should emit LOGIN event on successful login', async () => {
    const emitSpy = jest.spyOn(eventEmitter, 'emit');
    const dto = { method: AuthStrategy.EMAIL, email: 'test@example.com', password: 'password' };

    await service.login({ dto });

    expect(emitSpy).toHaveBeenCalledWith(
      AuthEvents.LOGIN,
      expect.objectContaining({
        auth: expect.objectContaining({ uid: 'user-1' }),
        tokens: expect.any(Object),
      })
    );
  });
});
