// src/auth/jwt.strategy.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../core/jwt.strategy'
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let authService: AuthService;

    const mockAuthService = {
        me: jest.fn(),
    };

    const mockOptions = {
        jwtSecret: 'test-secret',
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
                    provide: 'AUTH_MODULE_OPTIONS',
                    useValue: mockOptions,
                },
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