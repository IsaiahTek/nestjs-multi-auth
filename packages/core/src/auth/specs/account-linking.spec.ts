import { SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AuthTransport } from '../enums/auth-type.enum';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
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

describe('AuthController Account Linking', () => {
    let controller: AuthController;
    let authService: AuthService;
    let authCookieService: AuthContextService;

    const mockAuthService = {
        signup: jest.fn(),
    };

    const mockCookieService = {
        get: jest.fn().mockReturnValue({
            accessTokenName: 'access_token',
            refreshTokenName: 'refresh_token',
        }),
        getNamespace: jest.fn().mockReturnValue(undefined)
    };

    const mockOptions = {
        transport: [AuthTransport.BEARER],
    };

    const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const mockRequest = {
        user: { uid: 'user-123' },
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
        originalUrl: '/auth/link',
    } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
                { provide: AuthContextService, useValue: mockCookieService },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
        })
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
        authCookieService = module.get<AuthContextService>(AuthContextService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('link', () => {
        it('should call authService.signup with current user uid', async () => {
            const dto = { method: 'google', token: 'google-token' } as any;
            const mockResult = { auth: { id: 'auth-1' }, message: 'Linked' };
            mockAuthService.signup.mockResolvedValue(mockResult);

            const result = await controller.link(dto, mockRequest, mockResponse);

            expect(authService.signup).toHaveBeenCalledWith({ dto, uid: 'user-123', userAgent: 'test-agent', ip: '127.0.0.1' });
            expect(result).toEqual({ message: 'Linked', auth: mockResult.auth });
        });

        it('should handle verification requirement if linking new method', async () => {
            const dto = { method: 'email', email: 'new@email.com' } as any;
            const mockResult = { auth: { id: 'auth-2' }, verificationRequired: true };
            mockAuthService.signup.mockResolvedValue(mockResult);

            const result = await controller.link(dto, mockRequest, mockResponse);

            expect(result.verificationRequired).toBe(true);
        });
    });
});
