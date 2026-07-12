import { SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
// src/auth/jwt.strategy.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../core/jwt.strategy'
import { UnauthorizedException } from '@nestjs/common';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { AuthContextService } from '../core/auth-context.resolver';


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
    findByStrategyAndValue: jest.fn()
});

let mockRepo: any = createMockRepo();

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let authService: AuthService;

    const mockAuthService = {
        me: jest.fn(),
    };

    const mockOptions = {
        jwtSecret: 'test-secret',
    };

    const mockCookieService = {
        get: jest.fn().mockReturnValue({
            accessTokenName: 'root_access_token',
            refreshTokenName: 'root_refresh_token',
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: AUTH_MODULE_OPTIONS,
                    useValue: mockOptions,
                },
                {
                    provide: AuthContextService,
                    useValue: mockCookieService,
                },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
        authService = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validate', () => {
        it('should return user when user exists', async () => {
            const payload = {
                sub: 'user-123',
                sessionId: 'session-abc',
            };

            const user = {
                uid: 'user-123',
            };

            mockAuthService.me.mockResolvedValue(user);

            const result = await strategy.validate(payload as any);

            expect(authService.me).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({
                uid: user.uid,
                sessionId: 'session-abc',
                user,
            });
        });

        it('should throw UnauthorizedException when user does not exist', async () => {
            const payload = {
                sub: 'user-123',
                sessionId: 'session-abc',
            };

            mockAuthService.me.mockResolvedValue(null);

            await expect(strategy.validate(payload as any)).rejects.toThrow(
                UnauthorizedException,
            );

            expect(authService.me).toHaveBeenCalledWith('user-123');
        });
    });
});
