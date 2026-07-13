import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dto/requests/login.dto';
import { SignupDto } from '../dto/requests/signup.dto';
import * as crypto from 'crypto';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';
import { AuthRepository, AuthIdentifierRepository } from '../interfaces/repositories.interface';

// Entities
import { Auth, AuthIdentifier } from '../interfaces/models.interface';
import { IdentifierType, IdentifierSource } from '../enums/identifier-type.enum';

// Enums
import { AuthStrategy } from '../enums/auth-type.enum';

@Injectable()
export class LocalAuthStrategy {
  constructor(
    @Inject(AUTH_REPOSITORY_TOKEN) private authRepo: AuthRepository,
    @Inject(AUTH_IDENTIFIER_REPOSITORY_TOKEN) private identifierRepo: AuthIdentifierRepository,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
  ) { }

  private readonly logger: Logger = new Logger(LocalAuthStrategy.name);

  private validatePhoneFormat(phone: string) {
    const prefixes = this.options.allowedPhonePrefixes;
    if (!prefixes || prefixes.length === 0) return;

    const matches = prefixes.some((prefix) => phone.startsWith(prefix));
    if (!matches) {
      throw new BadRequestException(
        `Phone number must start with ${prefixes.length > 1 ? 'one of these prefixes' : 'this prefix'}: ${prefixes.join(', ')}`,
      );
    }
  }

  private requiresPassword(type: IdentifierType | 'EMAIL' | 'PHONE' | 'USERNAME'): boolean {
    switch (type) {
      case IdentifierType.EMAIL:
      case 'EMAIL':
        return this.options.emailRequiresPassword ?? true;
      case IdentifierType.PHONE:
      case 'PHONE':
        return this.options.phoneRequiresPassword ?? false;
      case IdentifierType.USERNAME:
      case 'USERNAME':
        return this.options.usernameRequiresPassword ?? true;
      default:
        return true;
    }
  }

  async registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);

    if (dto.email && !enabledStrategies.includes(AuthStrategy.EMAIL) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Email authentication is currently disabled.');
    }
    if (dto.phone && !enabledStrategies.includes(AuthStrategy.PHONE) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Phone authentication is currently disabled.');
    }
    if (dto.username && !enabledStrategies.includes(AuthStrategy.USERNAME) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Username authentication is currently disabled.');
    }

    if (!dto.email && !dto.phone && !dto.username) {
      throw new BadRequestException('Email, phone or username is required');
    }

    if (dto.phone) {
      this.validatePhoneFormat(dto.phone);
    }

    const emailReq = dto.email ? this.requiresPassword('EMAIL') : false;
    const phoneReq = dto.phone ? this.requiresPassword('PHONE') : false;
    const userReq = dto.username ? this.requiresPassword('USERNAME') : false;

    const passwordRequired = emailReq || phoneReq || userReq;

    if (!dto.password && passwordRequired) {
      throw new BadRequestException('Password is required');
    }

    const identifiersToCheck: string[] = [];
    if (dto.email) identifiersToCheck.push(dto.email.toLowerCase());
    if (dto.phone) identifiersToCheck.push(dto.phone);
    if (dto.username) identifiersToCheck.push(dto.username.toLowerCase());

    for (const val of identifiersToCheck) {
      const existing = await this.identifierRepo.findByValue(val);
      if (existing) {
        if (existing.type === IdentifierType.PHONE) {
          throw new BadRequestException('Unable to signup with those credentials. Try changing phone number');
        }
        if (existing.type === IdentifierType.EMAIL) {
          throw new BadRequestException('Unable to signup with those credentials. Try changing email');
        }
        if (existing.type === IdentifierType.USERNAME) {
          throw new BadRequestException('Unable to signup with those credentials. Try changing username');
        }
      }
    }

    const hash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const identityUid = uid || crypto.randomUUID();

    const newAuth = await this.authRepo.create({
      uid: identityUid,
      strategy: dto.method || AuthStrategy.LOCAL,
      secretHash: hash,
      isActive: true,
      isPrimary: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newIdentifiers: AuthIdentifier[] = [];

    if (dto.email) {
      newIdentifiers.push(await this.identifierRepo.create({
        type: IdentifierType.EMAIL,
        value: dto.email.toLowerCase(),
        isVerified: false,
        source: IdentifierSource.LOCAL,
      }));
    }

    if (dto.phone) {
      newIdentifiers.push(await this.identifierRepo.create({
        type: IdentifierType.PHONE,
        value: dto.phone,
        isVerified: false,
        source: IdentifierSource.LOCAL,
      }));
    }

    if (dto.username) {
      newIdentifiers.push(await this.identifierRepo.create({
        type: IdentifierType.USERNAME,
        value: dto.username.toLowerCase(),
        isVerified: false,
        source: IdentifierSource.LOCAL,
      }));
    }

    newAuth.identifiers = newIdentifiers;
    const auth = await this.authRepo.save(newAuth);
    return { auth, identifier: auth.identifiers?.[0] };
  }

  async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);
    const identifierValue = dto.emailOrPhone || dto.email || dto.phone || dto.username;

    if (!identifierValue) {
      throw new BadRequestException('Email, phone or username is required');
    }

    const isEmail = !!dto.email || (!!dto.emailOrPhone && dto.emailOrPhone.includes('@'));
    const isPhone = !!dto.phone || (!!dto.emailOrPhone && /^\+?[0-9]+$/.test(dto.emailOrPhone));
    const isUsername = !!dto.username || (!isEmail && !isPhone);

    const passwordRequired =
      (isEmail && this.requiresPassword('EMAIL')) ||
      (isPhone && this.requiresPassword('PHONE')) ||
      (isUsername && this.requiresPassword('USERNAME'));

    if (!dto.password && passwordRequired) {
      throw new BadRequestException('Password is required');
    }

    if (isEmail && !enabledStrategies.includes(AuthStrategy.EMAIL) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Email authentication is currently disabled.');
    }
    if (isPhone && !enabledStrategies.includes(AuthStrategy.PHONE) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Phone authentication is currently disabled.');
    }
    if (isPhone) {
      this.validatePhoneFormat(identifierValue);
    }
    if (isUsername && !enabledStrategies.includes(AuthStrategy.USERNAME) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Username authentication is currently disabled.');
    }

    const result = await this.identifierRepo.findWithAuthByValue(identifierValue.toLowerCase());

    if (!result || !result.auth) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const identifier = result.identifier;
    const auth = result.auth;

    const localStrategies = [
      AuthStrategy.EMAIL,
      AuthStrategy.PHONE,
      AuthStrategy.USERNAME,
      AuthStrategy.LOCAL,
    ];

    if (!localStrategies.includes(auth.strategy)) {
      this.logger.log(`User tried to login with ${auth.strategy} strategy`);
      throw new UnauthorizedException('Please login with your Social Account');
    }

    if (dto.password && auth.secretHash) {
      const valid = await bcrypt.compare(dto.password, auth.secretHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } else if (dto.password && !auth.secretHash) {
      throw new UnauthorizedException('This account does not have a password set. Please use another method.');
    } else if (!dto.password && auth.secretHash) {
      throw new UnauthorizedException('Password is required for this account');
    }

    auth.lastUsedAt = new Date();
    await this.authRepo.save(auth);

    return { auth, identifier };
  }
}
