import { Test, TestingModule } from '@nestjs/testing';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../entities/auth.entity';
import { AuthIdentifier, IdentifierType } from '../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthStrategy } from '../enums/auth-type.enum';

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

    const createStrategyWithOptions = (options: Partial<AuthModuleOptions>) => {
        return new LocalAuthStrategy(
            mockDataSource as any,
            mockAuthRepo as any,
            mockIdentifierRepo as any,
            options as any,
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
            const customStrategy = createStrategyWithOptions({ phoneRequiresPassword: true });
            const dto = { phone: '+1234567890', method: AuthStrategy.PHONE };
            await expect(customStrategy.registerCredentials(dto as any)).rejects.toThrow(BadRequestException);
        });

        it('should allow email registration without password if emailRequiresPassword is false', async () => {
            const customStrategy = createStrategyWithOptions({ emailRequiresPassword: false });
            const dto = { email: 'test@example.com', method: AuthStrategy.EMAIL };
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

            const result = await customStrategy.registerCredentials(dto as any);
            expect(result).toBeDefined();
        });

        it('should throw if email password missing and emailRequiresPassword is true (default)', async () => {
            const dto = { email: 'test@example.com', method: AuthStrategy.EMAIL };
            await expect(strategy.registerCredentials(dto as any)).rejects.toThrow(BadRequestException);
            await expect(strategy.registerCredentials(dto as any)).rejects.toThrow('Password is required');
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
            const customStrategy = createStrategyWithOptions({ phoneRequiresPassword: true });
            const dto = { phone: '+1234567890', method: AuthStrategy.PHONE };
            await expect(customStrategy.login(dto as any)).rejects.toThrow(BadRequestException);
        });

        it('should allow email login without password if emailRequiresPassword is false', async () => {
            const customStrategy = createStrategyWithOptions({ emailRequiresPassword: false });
            const dto = { email: 'test@example.com', method: AuthStrategy.EMAIL };
            identifierRepo.findOne.mockResolvedValue({
                auth: { id: 'auth-id', strategy: AuthStrategy.EMAIL }
            });
            authRepo.findOne.mockResolvedValue({ id: 'auth-id', secretHash: null });

            const result = await customStrategy.login(dto as any);
            expect(result).toBeDefined();
        });

        it('should throw if email password missing and emailRequiresPassword is true (default) during login', async () => {
            const dto = { email: 'test@example.com', method: AuthStrategy.EMAIL };
            await expect(strategy.login(dto as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('Phone Prefix Validation', () => {
        const createStrategyWithPrefixes = (prefixes: string[]) => {
            return new LocalAuthStrategy(
                mockDataSource as any,
                mockAuthRepo as any,
                mockIdentifierRepo as any,
                { allowedPhonePrefixes: prefixes } as any,
            );
        };

        it('should allow registration with a valid phone prefix', async () => {
            const customStrategy = createStrategyWithPrefixes(['+234', '+44']);
            const dto = { phone: '+2348012345678', method: AuthStrategy.PHONE };

            mockDataSource.transaction.mockImplementation(async (cb) => cb({
                getRepository: (entity: any) => {
                    if (entity === Auth) return mockAuthRepo;
                    if (entity === AuthIdentifier) return mockIdentifierRepo;
                }
            }));
            mockIdentifierRepo.findOne.mockResolvedValue(null);
            mockAuthRepo.create.mockReturnValue({ identifiers: [] });
            mockAuthRepo.save.mockResolvedValue({ id: 'auth-id', identifiers: [{ type: 'PHONE', value: '+2348012345678' }] });

            const result = await customStrategy.registerCredentials(dto as any);
            expect(result).toBeDefined();
        });

        it('should throw on registration with an invalid phone prefix', async () => {
            const customStrategy = createStrategyWithPrefixes(['+234', '+44']);
            const dto = { phone: '+1234567890', method: AuthStrategy.PHONE };

            await expect(customStrategy.registerCredentials(dto as any)).rejects.toThrow(BadRequestException);
            await expect(customStrategy.registerCredentials(dto as any)).rejects.toThrow(/Phone number must start with one of/);
        });

        it('should allow login with a valid phone prefix', async () => {
            const customStrategy = createStrategyWithPrefixes(['+234', '+44']);
            const dto = { phone: '+447912345678', method: AuthStrategy.PHONE };

            mockIdentifierRepo.findOne.mockResolvedValue({
                auth: { id: 'auth-id', strategy: AuthStrategy.PHONE }
            });
            mockAuthRepo.findOne.mockResolvedValue({ id: 'auth-id', secretHash: null });

            const result = await customStrategy.login(dto as any);
            expect(result).toBeDefined();
        });

        it('should throw on login with an invalid phone prefix', async () => {
            const customStrategy = createStrategyWithPrefixes(['+234', '+44']);
            const dto = { phone: '+1234567890', method: AuthStrategy.PHONE };

            await expect(customStrategy.login(dto as any)).rejects.toThrow(BadRequestException);
            await expect(customStrategy.login(dto as any)).rejects.toThrow(/Phone number must start with one of/);
        });
    });
});
