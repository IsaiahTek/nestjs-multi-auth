import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE } from '../interfaces/auth-otp-provider.interface';
import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { Test, TestingModule } from '@nestjs/testing';
import { LocalAuthStrategy } from '../strategies/local-auth.strategy';
import { DataSource } from 'typeorm';
// removed entity import auth.entity';
// removed entity import auth-identify.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthStrategy } from '../enums/auth-type.enum';


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
    findByValue: jest.fn(),
    findByUidAndStrategies: jest.fn(),
    findByUidAndType: jest.fn(),
    findByStrategyAndValue: jest.fn()
});

let mockRepo: any = createMockRepo();

describe('LocalAuthStrategy', () => {
    let strategy: LocalAuthStrategy;
    let authRepo: any = createMockRepo();
    let identifierRepo: any = createMockRepo();

    const mockDataSource = {
        transaction: jest.fn(),
    };

    const mockAuthRepo: any = createMockRepo();

    const mockIdentifierRepo: any = createMockRepo();

    const createStrategyWithOptions = (options: Partial<AuthModuleOptions>) => {
        return new LocalAuthStrategy(mockAuthRepo as any, mockIdentifierRepo as any, options as any);
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LocalAuthStrategy,
                { provide: DataSource, useValue: mockDataSource },
                { provide: AUTH_REPOSITORY_TOKEN, useValue: mockAuthRepo }, { provide: 'AUTH_OTP_PROVIDER', useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } },
                { provide: AUTH_OTP_PROVIDER_EMAIL, useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } },
                { provide: AUTH_OTP_PROVIDER_PHONE, useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } },
                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockIdentifierRepo },
                { provide: AUTH_MODULE_OPTIONS, useValue: { phoneRequiresPassword: false } },
              { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: mockRepo },
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
                    if (entity === AUTH_REPOSITORY_TOKEN) return mockAuthRepo;
                    if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return mockIdentifierRepo;
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
                    if (entity === AUTH_REPOSITORY_TOKEN) return mockAuthRepo;
                    if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return mockIdentifierRepo;
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
            identifierRepo.findWithAuthByValue.mockResolvedValue({
                identifier: { type: 'PHONE' }, auth: { id: 'auth-id', strategy: AuthStrategy.LOCAL }
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
            identifierRepo.findWithAuthByValue.mockResolvedValue({
                identifier: { type: 'PHONE' }, auth: { id: 'auth-id', strategy: AuthStrategy.EMAIL }
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
            return new LocalAuthStrategy(mockAuthRepo as any, mockIdentifierRepo as any, { allowedPhonePrefixes: prefixes } as any);
        };

        it('should allow registration with a valid phone prefix', async () => {
            const customStrategy = createStrategyWithPrefixes(['+234', '+44']);
            const dto = { phone: '+2348012345678', method: AuthStrategy.PHONE };

            mockDataSource.transaction.mockImplementation(async (cb) => cb({
                getRepository: (entity: any) => {
                    if (entity === AUTH_REPOSITORY_TOKEN) return mockAuthRepo;
                    if (entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN) return mockIdentifierRepo;
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

            mockIdentifierRepo.findWithAuthByValue.mockResolvedValue({
                identifier: { type: 'PHONE' }, auth: { id: 'auth-id', strategy: AuthStrategy.PHONE }
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
