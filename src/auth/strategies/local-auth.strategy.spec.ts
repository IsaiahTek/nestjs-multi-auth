import { Test, TestingModule } from '@nestjs/testing';
import { LocalAuthStrategy } from './local-auth.strategy';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier, IdentifierType } from '../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS } from '../interfaces/auth-module-options.interface';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthStrategy } from '../auth-type.enum';

describe('LocalAuthStrategy', () => {
    let strategy: LocalAuthStrategy;
    let authRepo: any;
    let identifierRepo: any;

    const mockDataSource = {
        transaction: jest.fn(),
    };

    const mockAuthRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockIdentifierRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const createStrategyWithPhonePassword = (required: boolean) => {
        return new LocalAuthStrategy(
            mockDataSource as any,
            mockAuthRepo as any,
            mockIdentifierRepo as any,
            { phoneRequiresPassword: required } as any,
        );
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LocalAuthStrategy,
                { provide: DataSource, useValue: mockDataSource },
                { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
                { provide: getRepositoryToken(AuthIdentifier), useValue: mockIdentifierRepo },
                { provide: AUTH_MODULE_OPTIONS, useValue: { phoneRequiresPassword: false } },
            ],
        }).compile();

        strategy = module.get<LocalAuthStrategy>(LocalAuthStrategy);
        authRepo = mockAuthRepo;
        identifierRepo = mockIdentifierRepo;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('registerCredentials', () => {
        it('should allow phone registration without password by default', async () => {
            const dto = { phone: '+1234567890', method: AuthStrategy.LOCAL };
            mockDataSource.transaction.mockImplementation(async (cb) => cb({
                getRepository: (entity: any) => {
                    if (entity === Auth) return mockAuthRepo;
                    if (entity === AuthIdentifier) return mockIdentifierRepo;
                }
            }));
            mockIdentifierRepo.findOne.mockResolvedValue(null);
            mockAuthRepo.create.mockReturnValue({});
            mockIdentifierRepo.create.mockReturnValue({});
            mockAuthRepo.save.mockResolvedValue({ id: 'auth-id' });

            const result = await strategy.registerCredentials(dto as any);
            expect(result).toBeDefined();
        });

        it('should throw if password is missing and phoneRequiresPassword is true', async () => {
            const customStrategy = createStrategyWithPhonePassword(true);
            const dto = { phone: '+1234567890', method: AuthStrategy.LOCAL };
            await expect(customStrategy.registerCredentials(dto as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('login', () => {
        it('should allow phone login without password by default', async () => {
            const dto = { phone: '+1234567890', method: AuthStrategy.LOCAL };
            identifierRepo.findOne.mockResolvedValue({
                auth: { id: 'auth-id', strategy: AuthStrategy.LOCAL }
            });
            authRepo.findOne.mockResolvedValue({ id: 'auth-id', secretHash: null });

            const result = await strategy.login(dto as any);
            expect(result).toBeDefined();
        });

        it('should throw if password is missing and phoneRequiresPassword is true during login', async () => {
            const customStrategy = createStrategyWithPhonePassword(true);
            const dto = { phone: '+1234567890', method: AuthStrategy.LOCAL };
            await expect(customStrategy.login(dto as any)).rejects.toThrow(BadRequestException);
        });
    });
});
