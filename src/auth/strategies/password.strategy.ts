import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
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
import { AUTH_USER_SERVICE, AuthUserService } from '../interfaces/auth-user-service.interface';

@Injectable()
export class PasswordAuthStrategy {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Auth) private authRepo: Repository<Auth>,
    @InjectRepository(AuthIdentifier)
    private identifierRepo: Repository<AuthIdentifier>,
    @Inject(AUTH_USER_SERVICE) private readonly userService: AuthUserService,
  ) { }

  private readonly logger: Logger = new Logger(PasswordAuthStrategy.name);

  async signup(dto: SignupDto): Promise<Auth> {
    // 1. Validation
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }
    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }

    // 2. Prepare the list of identifiers we want to claim
    const identifiersToCheck: string[] = [];
    if (dto.email) identifiersToCheck.push(dto.email.toLowerCase());
    if (dto.phone) identifiersToCheck.push(dto.phone);

    return this.dataSource.transaction(async (manager) => {
      const authIdentifierRepo = manager.getRepository(AuthIdentifier);
      const authRepo = manager.getRepository(Auth);

      // 3. 🔒 Check uniqueness (Look in the Identifier table, not Auth table)
      const existing = await authIdentifierRepo.findOne({
        where: { value: In(identifiersToCheck) },
      });

      if (existing) {
        throw new BadRequestException(
          'Unable to signup with those credentials. Try changing email or phone',
        );
      }

      // 4. Create User (Delegated to generic user service)
      const user = await this.userService.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        ...dto, // pass other fields like role, bio for the consuming service
      });

      // 5. Hash Password
      const hash = await bcrypt.hash(dto.password!, 10);

      // 6. Create the Auth Credential (The "Account")
      const newAuth = authRepo.create({
        userId: user.id, // Store userId instead of linking to entity
        strategy: AuthStrategy.LOCAL, // Correct Enum
        secretHash: hash,
        isActive: true,
        isPrimary: true, // Assuming first signup is primary
      });

      // 7. Create the Identifiers (The "Lookups")
      const newIdentifiers: AuthIdentifier[] = [];

      if (dto.email) {
        newIdentifiers.push(
          authIdentifierRepo.create({
            type: IdentifierType.EMAIL,
            value: dto.email.toLowerCase(),
            // auth: newAuth - TypeORM handles this if we push to newAuth.identifiers
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

    if (!dto.emailOrPhone) {
      throw new BadRequestException('Email or phone is required');
    }

    // 1. Look up the Identifier first (e.g., find row where value = "john@gmail.com")
    // We join 'auth' and 'auth.user' so we have everything we need.
    const identifier = await this.identifierRepo.findOne({
      where: { value: dto.emailOrPhone.toLowerCase() },
      relations: ['auth', 'auth.user'],
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
