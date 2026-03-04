import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AUTH_MODULE_OPTIONS } from './auth.module';
import { AuthTransport } from './auth-type.enum';
import { Response, Request } from 'express';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockOptions: AuthModuleOptions = {
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-refresh-secret',
        userService: class { } as any,
        transport: [AuthTransport.BEARER, AuthTransport.COOKIE],
    };

    const mockAuthService = {
        signup: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
        logout: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: AUTH_MODULE_OPTIONS, useValue: mockOptions },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
