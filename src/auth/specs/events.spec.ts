import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from '../auth.service';
import { AuthEvents } from '../enums/auth.events';
import { SignupDto } from '../dto/requests/signup.dto';
import { AuthStrategy } from '../enums/auth-type.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from '../entities/session.entity';
import { Auth } from '../entities/auth.entity';
import { OtpToken } from '../entities/otp-token.entity';
import { MfaMethod } from '../entities/mfa-method.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { OAuthAuthStrategy } from '../strategies/oauth/oauth.strategy';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';

describe('AuthService Events', () => {
  let service: AuthService;
  let eventEmitter: EventEmitter2;

  const mockRepo = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(dto => Promise.resolve({ ...dto, id: 'uuid' })),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
  };

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
        { provide: getRepositoryToken(Session), useValue: mockRepo },
        { provide: getRepositoryToken(Auth), useValue: mockRepo },
        { provide: getRepositoryToken(OtpToken), useValue: mockRepo },
        { provide: getRepositoryToken(MfaMethod), useValue: mockRepo },
        { provide: LocalAuthStrategy, useValue: mockPasswordStrategy },
        { provide: OAuthAuthStrategy, useValue: {} },
        {
          provide: AUTH_MODULE_OPTIONS,
          useValue: {
            enabledStrategies: [AuthStrategy.EMAIL],
            jwtSecret: 'secret',
          },
        },
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
