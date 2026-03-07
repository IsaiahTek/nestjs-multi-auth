import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { AuthIdentifier } from './entities/auth-identify.entity';
import { OtpToken } from './entities/otp-token.entity';
import { MfaMethod } from './entities/mfa-method.entity';
import { Session } from './entities/session.entity';
import { DataSource } from 'typeorm';

describe('AuthModule Compilation', () => {
    let module: TestingModule;

    const mockRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    it('should compile with default options', async () => {
        module = await Test.createTestingModule({
            imports: [
                AuthModule.register({
                    jwtSecret: 'test',
                    jwtRefreshSecret: 'test-refresh',
                }),
            ],
        })
            .overrideProvider(getRepositoryToken(Auth)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OAuthProvider)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(AuthIdentifier)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(OtpToken)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(MfaMethod)).useValue(mockRepo)
            .overrideProvider(getRepositoryToken(Session)).useValue(mockRepo)
            .overrideProvider(DataSource).useValue({})
            .compile();

        expect(module).toBeDefined();
    });
});
