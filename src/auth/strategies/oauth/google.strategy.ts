/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { LoginDto } from '../../dto/login.dto';
import { SignupDto } from '../../dto/signup.dto';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier, IdentifierType } from '../../entities/auth-identify.entity';
import { AuthStrategy, OAuthProviderType } from '../../auth-type.enum';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from './oauth-strategy.interface';
import { randomUUID } from 'crypto';

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

  async registerCredentials(dto: SignupDto, uid?: string): Promise<Auth> {
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
          })
        );
      }

      newAuth.identifiers = identifiers;

      const oauthProvider = oauthProviderRepo.create({
        provider: OAuthProviderType.GOOGLE,
        providerUserId: googleId,
      });

      newAuth.oauthProvider = oauthProvider;

      return await authRepo.save(newAuth);
    });
  }

  async login(dto: LoginDto): Promise<Auth> {
    if (!dto.token) {
      throw new BadRequestException('Google ID token is required');
    }

    const payload = await this.verifyToken(dto.token);
    const googleId = payload.sub;

    const oauthProvider = await this.oauthProviderRepo.findOne({
      where: { provider: OAuthProviderType.GOOGLE, providerUserId: googleId },
      relations: ['auth', 'auth.identifiers'],
    });

    if (!oauthProvider || !oauthProvider.auth) {
      throw new BadRequestException('No account found linked to this Google account. Please sign up.');
    }

    const auth = oauthProvider.auth;
    auth.lastUsedAt = new Date();
    await this.authRepo.save(auth);

    return auth;
  }
}
