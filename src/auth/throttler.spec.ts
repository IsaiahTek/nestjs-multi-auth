import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';
import { AUTH_MODULE_OPTIONS } from './interfaces/auth-module-options.interface';
import { AuthTransport } from './auth-type.enum';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { Session } from './entities/session.entity';

describe('Throttler Integration', () => {
    let app: INestApplication;
    let authService: AuthService;

    const mockRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                AuthModule.register({
                    jwtSecret: 'test',
                    jwtRefreshSecret: 'test-refresh',
                    throttlerLimit: 2, // Very low for testing
                    throttlerTtl: 60,
                }),
            ],
        })
            .overrideProvider(getRepositoryToken(Auth)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OAuthProvider)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(AuthIdentifier)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OtpToken)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(MfaMethod)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(Session)).useValue(mockRepo)
            .overrideProvider(AuthService).useValue({ login: jest.fn().mockResolvedValue({ auth: {} }) })
            .compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return 429 after exceeding limit', async () => {
        // First request - OK
        await request(app.getHttpServer())
            .post('/auth/signin')
            .send({ method: 'email', email: 'test@test.com', password: 'password' })
            .expect(201);

        // Second request - OK
        await request(app.getHttpServer())
            .post('/auth/signin')
            .send({ method: 'email', email: 'test@test.com', password: 'password' })
            .expect(201);

        // Third request - 429
        await request(app.getHttpServer())
            .post('/auth/signin')
            .send({ method: 'email', email: 'test@test.com', password: 'password' })
            .expect(429);
    });
});
