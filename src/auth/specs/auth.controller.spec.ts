import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { AUTH_MODULE_OPTIONS } from '../auth.module';
import { AuthTransport } from '../enums/auth-type.enum';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthContextService } from '../core/auth-context.resolver';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;
    let cookieService: AuthContextService;

    const mockOptions: AuthModuleOptions = {
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-refresh-secret',
        transport: [AuthTransport.BEARER, AuthTransport.COOKIE],
    };

    const mockAuthService = {
        signup: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
        logout: jest.fn(),
        deleteAccount: jest.fn(),
        deleteAuthMethod: jest.fn(),
    };

    const mockCookieService = {
        get: jest.fn().mockReturnValue({
            accessTokenName: 'test_access_token',
            refreshTokenName: 'test_refresh_token',
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
                { provide: AuthContextService, useValue: mockCookieService },
            ],
        })
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
        cookieService = module.get<AuthContextService>(AuthContextService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
