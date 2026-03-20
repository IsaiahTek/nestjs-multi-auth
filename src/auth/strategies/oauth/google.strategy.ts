/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier, IdentifierSource, IdentifierType } from '../../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { randomUUID } from 'crypto';
import { LoginDto } from '../../dto/requests/login.dto';
import { SignupDto } from '../../dto/requests/signup.dto';
import { OAuthProviderType, AuthStrategy } from '../../enums/auth-type.enum';

@Injectable()
export class GoogleAuthStrategy implements IOAuthStrategy {
  private client: OAuth2Client;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Auth) private authRepo: Repository<Auth>,
    @InjectRepository(OAuthProvider) private oauthProviderRepo: Repository<OAuthProvider>,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
  ) {
    this.client = new OAuth2Client(this.options.googleClientId);
  }

  private async verifyToken(token: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.options.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new BadRequestException('Invalid Google token payload');
      }
      return payload;
    } catch (error) {
      throw new BadRequestException('Invalid Google token');
    }
  }

  async registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    if (!dto.token) {
      throw new BadRequestException('Google ID token is required');
    }

    const payload = await this.verifyToken(dto.token);
    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();

    return this.dataSource.transaction(async (manager) => {
      const authRepo = manager.getRepository(Auth);
      const oauthProviderRepo = manager.getRepository(OAuthProvider);
      const identifierRepo = manager.getRepository(AuthIdentifier);

      // Check if this Google account is already linked
      const existingProvider = await oauthProviderRepo.findOne({
        where: { provider: OAuthProviderType.GOOGLE, providerUserId: googleId },
        relations: ['auth'],
      });

      if (existingProvider) {
        throw new BadRequestException('This Google account is already linked to a user');
      }

      // Check if email identifier is already taken
      if (email) {
        const existingIdentifier = await identifierRepo.findOne({
          where: { value: email, type: IdentifierType.EMAIL },
        });
        if (existingIdentifier) {
          throw new BadRequestException('A user with this email already exists. Please login instead.');
        }
      }

      const identityUid = uid || randomUUID();

      const newAuth = authRepo.create({
        uid: identityUid,
        strategy: AuthStrategy.OAUTH,
        isActive: true,
        isVerified: payload.email_verified || false,
        isPrimary: true,
      });

      const identifiers: AuthIdentifier[] = [];
      if (email) {
        identifiers.push(
          identifierRepo.create({
            type: IdentifierType.EMAIL,
            value: email,
            isVerified: payload.email_verified || false,
            source: IdentifierSource.GOOGLE,
            verifiedBy: payload.email_verified ? 'PROVIDER' : undefined,
          })
        );
      }

      newAuth.identifiers = identifiers;

      const oauthProvider = oauthProviderRepo.create({
        provider: OAuthProviderType.GOOGLE,
        providerUserId: googleId,
        rawProfile: payload,
        displayName: payload.name,
        avatarUrl: payload.picture,
        emailVerified: payload.email_verified,
        expiresAt: payload.exp,
      });

      newAuth.oauthProviders = [...(newAuth.oauthProviders || []), oauthProvider];

      return { auth: await authRepo.save(newAuth), identifier: newAuth.identifiers?.[0] };
    });
  }

  // async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
  //   if (!dto.token) {
  //     throw new BadRequestException('Google ID token is required');
  //   }

  //   const payload = await this.verifyToken(dto.token);
  //   const googleId = payload.sub;

  //   const oauthProvider = await this.oauthProviderRepo.findOne({
  //     where: { provider: OAuthProviderType.GOOGLE, providerUserId: googleId },
  //     relations: ['auth', 'auth.identifiers'],
  //   });

  //   if (!oauthProvider || !oauthProvider.auth) {
  //     throw new BadRequestException('No account found linked to this Google account. Please sign up.');
  //   }

  //   const auth = oauthProvider.auth;
  //   auth.lastUsedAt = new Date();
  //   await this.authRepo.save(auth);

  //   // Find the identifier that matches the email from Google
  //   const email = payload.email?.toLowerCase();
  //   const identifier = auth.identifiers?.find(id => id.value === email);

  //   return { auth, identifier };
  // }

  async login(
    dto: LoginDto,
  ): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    if (!dto.token) {
      throw new BadRequestException('Google ID token is required');
    }

    const payload = await this.verifyToken(dto.token);

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();

    const result = await this.dataSource.transaction(async (manager) => {
      const oauthRepo = manager.getRepository(OAuthProvider);
      const authRepo = manager.getRepository(Auth);
      const identifierRepo = manager.getRepository(AuthIdentifier);

      // -------------------------
      // 1. Load OAuth Provider INSIDE transaction
      // -------------------------
      const oauthProvider = await oauthRepo.findOne({
        where: {
          provider: OAuthProviderType.GOOGLE,
          providerUserId: googleId,
        },
        relations: ['auth', 'auth.identifiers'],
      });

      if (!oauthProvider || !oauthProvider.auth) {
        throw new BadRequestException(
          'No account found linked to this Google account. Please sign up.',
        );
      }

      const auth = oauthProvider.auth;

      // -------------------------
      // 2. Update OAuth Provider
      // -------------------------
      oauthProvider.rawProfile = payload;
      oauthProvider.displayName = payload.name ?? null;
      oauthProvider.avatarUrl = payload.picture ?? null;
      oauthProvider.emailVerified = payload.email_verified ?? false;

      // -------------------------
      // 3. Update Auth
      // -------------------------
      auth.lastUsedAt = new Date();

      // -------------------------
      // 4. Handle Identifier (EMAIL)
      // -------------------------
      let identifier: AuthIdentifier | null = null;

      if (email) {
        identifier = await identifierRepo.findOne({
          where: {
            auth: { id: auth.id },
            type: IdentifierType.EMAIL,
          },
        });

        if (!identifier) {
          identifier = identifierRepo.create({
            auth,
            type: IdentifierType.EMAIL,
            value: email,
            isVerified: false,
          });
        }

        // always normalize + update
        identifier.value = email;
        identifier.isVerified = payload.email_verified ?? false;
        identifier.verifiedBy = payload.email_verified ? 'PROVIDER' : identifier.verifiedBy;
        identifier.source = IdentifierSource.GOOGLE;

        await identifierRepo.save(identifier);
      }

      // -------------------------
      // 5. Save core entities
      // -------------------------
      await oauthRepo.save(oauthProvider);
      await authRepo.save(auth);

      return { auth, identifier };
    });

    // -------------------------
    // 6. Reload fresh state (important for consistency)
    // -------------------------
    const updatedAuth = await this.authRepo.findOne({
      where: { id: result.auth.id },
      relations: ['identifiers', 'oauthProvider'],
    });

    const identifier = updatedAuth?.identifiers?.find(
      (i) => i.type === IdentifierType.EMAIL && i.value === email,
    );

    return {
      auth: updatedAuth!,
      identifier,
    };
  }
}
