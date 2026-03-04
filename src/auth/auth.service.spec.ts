import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordAuthStrategy } from './strategies/password.strategy';
import { GoogleAuthStrategy } from './strategies/google.strategy';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { AUTH_USER_SERVICE } from './interfaces/auth-user-service.interface';

describe('AuthService', () => {
    let service: AuthService;

    const mockJwtService = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
    };

    const mockPasswordStrategy = {
        login: jest.fn(),
        signup: jest.fn(),
    };

    const mockGoogleStrategy = {
        login: jest.fn(),
        signup: jest.fn(),
    };

    const mockSessionRepo = {
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn(),
        delete: jest.fn(),
    };

    const mockAuthUserService = {
        findById: jest.fn(),
        create: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: PasswordAuthStrategy, useValue: mockPasswordStrategy },
                { provide: GoogleAuthStrategy, useValue: mockGoogleStrategy },
                { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
                { provide: AUTH_USER_SERVICE, useValue: mockAuthUserService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
