/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier, IdentifierSource, IdentifierType } from '../../entities/auth-identify.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from './oauth-strategy.interface';
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

      newAuth.oauthProvider = oauthProvider;

      return { auth: await authRepo.save(newAuth), identifier: newAuth.identifiers?.[0] };
    });
  }

  async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    if (!dto.token) {
      throw new BadRequestException('Google ID token is required');
    }

    const payload = await this.verifyToken(dto.token);
    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();

    const oauthProvider = await this.oauthProviderRepo.findOne({
      where: { provider: OAuthProviderType.GOOGLE, providerUserId: googleId },
      relations: ['auth', 'auth.identifiers'],
    });

    if (!oauthProvider || !oauthProvider.auth) {
      throw new BadRequestException(
        'No account found linked to this Google account. Please sign up.',
      );
    }

    const auth = oauthProvider.auth;

    await this.dataSource.transaction(async (manager) => {
      const oauthRepo = manager.getRepository(OAuthProvider);
      const authRepo = manager.getRepository(Auth);
      const identifierRepo = manager.getRepository(AuthIdentifier);

      /* ------------------- Update OAuth Provider ------------------- */
      oauthProvider.rawProfile = payload;
      oauthProvider.displayName = payload.name;
      oauthProvider.avatarUrl = payload.picture;
      oauthProvider.emailVerified = payload.email_verified;

      /* ------------------- Update Auth ------------------- */
      auth.lastUsedAt = new Date();

      /* ------------------- Handle Identifier ------------------- */
      let identifier: AuthIdentifier | null = null;

      if (email) {
        identifier = await identifierRepo.findOne({
          where: {
            auth: { id: auth.id },
            type: IdentifierType.EMAIL,
            value: email,
          },
        });

        if (!identifier) {
          // create new identifier
          identifier = identifierRepo.create({
            auth,
            type: IdentifierType.EMAIL,
            value: email,
            isVerified: payload.email_verified || false,
            verifiedBy: payload.email_verified ? 'PROVIDER' : undefined,
            source: IdentifierSource.GOOGLE,
          });
        } else {
          // update existing
          identifier.isVerified = payload.email_verified || false;
          identifier.verifiedBy = payload.email_verified ? 'PROVIDER' : identifier.verifiedBy;
          identifier.source = IdentifierSource.GOOGLE;
        }

        await identifierRepo.save(identifier);
      }

      /* ------------------- Save Core Entities ------------------- */
      await Promise.all([
        oauthRepo.save(oauthProvider),
        authRepo.save(auth),
      ]);

      return { auth, identifier };
    });

    // Reload fresh data if needed
    const updatedAuth = await this.authRepo.findOne({
      where: { id: auth.id },
      relations: ['identifiers', 'oauthProvider'],
    });

    const identifier = updatedAuth?.identifiers?.find(
      (id) => id.value === email,
    );

    return { auth: updatedAuth, identifier };
  }
}
