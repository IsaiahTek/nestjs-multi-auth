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
export class PasswordAuthStrategy {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Auth) private authRepo: Repository<Auth>,
    @InjectRepository(AuthIdentifier)
    private identifierRepo: Repository<AuthIdentifier>,
  ) { }

  private readonly logger: Logger = new Logger(PasswordAuthStrategy.name);

  async registerCredentials(dto: SignupDto, uid?: string): Promise<Auth> {
    // 1. Validation
    if (!dto.email && !dto.phone && !dto.username) {
      throw new BadRequestException('Email, phone or username is required');
    }
    if (!dto.password) {
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
        throw new BadRequestException(
          'Unable to signup with those credentials. Try changing email, phone or username',
        );
      }

      // 4. Hash Password
      const hash = await bcrypt.hash(dto.password!, 10);

      // 5. Create the Auth Identity
      // If no uid is provided, this is a completely new account.
      // Generation will happen here or in AuthService if we want more control.
      // Let's generate it here if missing.
      const identityUid = uid || crypto.randomUUID();

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
      return await authRepo.save(newAuth);
    });
  }

  async login(dto: LoginDto): Promise<Auth> {
    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }

    const identifierValue = dto.emailOrPhone || dto.email || dto.phone || dto.username;

    if (!identifierValue) {
      throw new BadRequestException('Email, phone or username is required');
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

    if (!authWithSecret || !authWithSecret.secretHash) {
      // Should technically not happen if strategy is LOCAL, but good for safety
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Verify password
    const valid = await bcrypt.compare(dto.password, authWithSecret.secretHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 5. Update usage stats
    // We update the original 'auth' object which has the User loaded, to return full context
    auth.lastUsedAt = new Date();
    await this.authRepo.save(auth);

    return auth;
  }
}
