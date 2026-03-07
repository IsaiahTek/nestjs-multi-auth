import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { randomUUID } from 'crypto';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { Inject } from '@nestjs/common';

// Entities
import { Auth } from '../entities/auth.entity';
import {
  AuthIdentifier,
  IdentifierType,
} from '../entities/auth-identify.entity';

// Enums
import { AuthStrategy } from '../auth-type.enum'; // Ensure this path is correct

// Services / DTOs


@Injectable()
export class LocalAuthStrategy {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Auth) private authRepo: Repository<Auth>,
    @InjectRepository(AuthIdentifier)
    private identifierRepo: Repository<AuthIdentifier>,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
  ) { }

  private readonly logger: Logger = new Logger(LocalAuthStrategy.name);

  async registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);

    // 1. Validation of identifiers against enabled strategies
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
    const isPhoneSignUp = !!dto.phone;
    const phoneRequiresPassword = this.options.phoneRequiresPassword ?? false;

    if (!dto.password && (!isPhoneSignUp || phoneRequiresPassword)) {
      throw new BadRequestException('Password is required');
    }

    // 2. Prepare the list of identifiers we want to claim
    const identifiersToCheck: string[] = [];
    if (dto.email) identifiersToCheck.push(dto.email.toLowerCase());
    if (dto.phone) identifiersToCheck.push(dto.phone);
    if (dto.username) identifiersToCheck.push(dto.username.toLowerCase());

    return this.dataSource.transaction(async (manager) => {
      const authIdentifierRepo = manager.getRepository(AuthIdentifier);
      const authRepo = manager.getRepository(Auth);

      // 3. 🔒 Check uniqueness
      const existing = await authIdentifierRepo.findOne({
        where: { value: In(identifiersToCheck) },
      });

      if (existing) {
        if (existing.type === IdentifierType.PHONE) {
          throw new BadRequestException(
            'Unable to signup with those credentials. Try changing phone number',
          );
        }
        if (existing.type === IdentifierType.EMAIL) {
          throw new BadRequestException(
            'Unable to signup with those credentials. Try changing email',
          );
        }
        if (existing.type === IdentifierType.USERNAME) {
          throw new BadRequestException(
            'Unable to signup with those credentials. Try changing username',
          );
        }
      }

      // 4. Hash Password (if provided)
      const hash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

      // 5. Create the Auth Identity
      // If no uid is provided, this is a completely new account.
      // Generation will happen here or in AuthService if we want more control.
      // Let's generate it here if missing.
      const identityUid = uid || randomUUID();

      const newAuth = authRepo.create({
        uid: identityUid,
        strategy: dto.method || AuthStrategy.LOCAL,
        secretHash: hash,
        isActive: true,
        isPrimary: true,
      });

      // 7. Create the Identifiers (The "Lookups")
      const newIdentifiers: AuthIdentifier[] = [];

      if (dto.email) {
        newIdentifiers.push(
          authIdentifierRepo.create({
            type: IdentifierType.EMAIL,
            value: dto.email.toLowerCase(),
          }),
        );
      }

      if (dto.phone) {
        newIdentifiers.push(
          authIdentifierRepo.create({
            type: IdentifierType.PHONE,
            value: dto.phone,
          }),
        );
      }

      if (dto.username) {
        newIdentifiers.push(
          authIdentifierRepo.create({
            type: IdentifierType.USERNAME,
            value: dto.username.toLowerCase(),
          }),
        );
      }

      // Attach identifiers to auth to save them together (Cascade)
      newAuth.identifiers = newIdentifiers;

      // 8. Save (Cascade will save Auth + Identifiers)
      const auth = await authRepo.save(newAuth);
      return { auth, identifier: auth.identifiers?.[0] };
    });
  }

  async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    const isPhoneLogin = !!dto.phone || (!!dto.emailOrPhone && /^\+?[0-9]+$/.test(dto.emailOrPhone));
    const phoneRequiresPassword = this.options.phoneRequiresPassword ?? false;

    if (!dto.password && (!isPhoneLogin || phoneRequiresPassword)) {
      throw new BadRequestException('Password is required');
    }

    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);
    const identifierValue = dto.emailOrPhone || dto.email || dto.phone || dto.username;

    if (!identifierValue) {
      throw new BadRequestException('Email, phone or username is required');
    }

    // Validate identifier type against enabled strategies
    const isEmail = !!dto.email || (!!dto.emailOrPhone && dto.emailOrPhone.includes('@'));
    const isPhone = !!dto.phone || (!!dto.emailOrPhone && /^\+?[0-9]+$/.test(dto.emailOrPhone));
    const isUsername = !!dto.username || (!isEmail && !isPhone);

    if (isEmail && !enabledStrategies.includes(AuthStrategy.EMAIL) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Email authentication is currently disabled.');
    }
    if (isPhone && !enabledStrategies.includes(AuthStrategy.PHONE) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Phone authentication is currently disabled.');
    }
    if (isUsername && !enabledStrategies.includes(AuthStrategy.USERNAME) && !enabledStrategies.includes(AuthStrategy.LOCAL)) {
      throw new BadRequestException('Username authentication is currently disabled.');
    }

    // 1. Look up the Identifier first (e.g., find row where value = "john@gmail.com")
    // We join 'auth' and 'auth.user' so we have everything we need.
    const identifier = await this.identifierRepo.findOne({
      where: { value: identifierValue.toLowerCase() },
      relations: ['auth'],
    });

    if (!identifier || !identifier.auth) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const auth = identifier.auth;

    // 2. Safety Check: Ensure this identifier is actually linked to a Password account
    if (auth.strategy !== AuthStrategy.LOCAL) {
      throw new UnauthorizedException('Please login with your Social Account');
    }

    // 3. Retrieve the password hash
    // (Since select: false, it wasn't loaded in the relation above. We must explicitly fetch it)
    const authWithSecret = await this.authRepo.findOne({
      where: { id: auth.id },
      select: ['id', 'secretHash'], // Explicitly select the hidden column
    });

    if (!authWithSecret) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Verify password (if password was provided or required)
    if (dto.password && authWithSecret.secretHash) {
      const valid = await bcrypt.compare(dto.password, authWithSecret.secretHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } else if (dto.password && !authWithSecret.secretHash) {
      // Identity has no password, but one was provided
      throw new UnauthorizedException('This account does not have a password set. Please use another method.');
    } else if (!dto.password && authWithSecret.secretHash) {
      // Identity has a password, but none was provided
      throw new UnauthorizedException('Password is required for this account');
    }
    // If neither has a password, it's a password-less login (allowed for phone if verified elsewhere/contextually)

    // 5. Update usage stats
    // We update the original 'auth' object which has the User loaded, to return full context
    auth.lastUsedAt = new Date();
    await this.authRepo.save(auth);

    return { auth, identifier };
  }
}
