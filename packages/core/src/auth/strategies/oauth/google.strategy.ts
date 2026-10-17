import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { Auth, OAuthProvider, AuthIdentifier } from '../../interfaces/models.interface';
import { IdentifierSource, IdentifierType } from '../../enums/identifier-type.enum';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { randomUUID } from 'crypto';
import { LoginDto } from '../../dto/requests/login.dto';
import { SignupDto } from '../../dto/requests/signup.dto';
import { OAuthProviderType, AuthStrategy } from '../../enums/auth-type.enum';
import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN } from '../../interfaces/repository-tokens';
import { AuthRepository, AuthIdentifierRepository, OAuthProviderRepository } from '../../interfaces/repositories.interface';

@Injectable()
export class GoogleAuthStrategy implements IOAuthStrategy {
  private client: OAuth2Client;

  constructor(
    @Inject(AUTH_REPOSITORY_TOKEN) private authRepo: AuthRepository,
    @Inject(AUTH_IDENTIFIER_REPOSITORY_TOKEN) private identifierRepo: AuthIdentifierRepository,
    @Inject(OAUTH_PROVIDER_REPOSITORY_TOKEN) private oauthProviderRepo: OAuthProviderRepository,
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

    const providerWithAuth = await this.oauthProviderRepo.findWithAuthByProviderUserId(OAuthProviderType.GOOGLE, googleId);

    if (providerWithAuth) {
      if (providerWithAuth.auth) {
        if (uid && providerWithAuth.auth.uid === uid) {
          throw new BadRequestException('This Google account is already linked to your account');
        }
        throw new BadRequestException('This Google account is already linked to a user');
      } else {
        // Orphaned provider: auth was deleted. Clean it up.
        if (this.oauthProviderRepo.delete) {
          await this.oauthProviderRepo.delete(providerWithAuth.provider.id);
        } else if (this.oauthProviderRepo.deleteByAuthId && (providerWithAuth.provider as any).authId) {
          await this.oauthProviderRepo.deleteByAuthId((providerWithAuth.provider as any).authId);
        }
      }
    } else {
      // Fallback check if findWithAuthByProviderUserId was null because auth relation was missing
      const existingProvider = await this.oauthProviderRepo.findByProviderUserId(OAuthProviderType.GOOGLE, googleId);
      if (existingProvider) {
        if (this.oauthProviderRepo.delete) {
          await this.oauthProviderRepo.delete(existingProvider.id);
        } else if (this.oauthProviderRepo.deleteByAuthId && (existingProvider as any).authId) {
          await this.oauthProviderRepo.deleteByAuthId((existingProvider as any).authId);
        }
      }
    }

    const identityUid = uid || randomUUID();
    let existingUserIdentifier: AuthIdentifier | null = null;

    if (email) {
      const idResult = await this.identifierRepo.findWithAuthByValue(email);
      if (idResult) {
        if (idResult.auth) {
          if (uid && idResult.auth.uid === identityUid) {
            existingUserIdentifier = idResult.identifier;
          } else {
            throw new BadRequestException('A user with this email already exists. Please login instead.');
          }
        } else {
          // Orphaned identifier: auth was deleted. Clean it up.
          if (this.identifierRepo.delete) {
            await this.identifierRepo.delete(idResult.identifier.id);
          }
        }
      }
    }

    const existingAuths = await this.authRepo.findAllByUid(identityUid);
    const isFirstMethod = existingAuths.length === 0;

    const newAuth = await this.authRepo.create({
      uid: identityUid,
      strategy: AuthStrategy.OAUTH,
      isActive: true,
      isVerified: this.options.forceVerificationOnGoogleSignup ? false : (payload.email_verified || false),
      isPrimary: isFirstMethod,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const auth = await this.authRepo.save(newAuth);

    const identifiers: AuthIdentifier[] = [];
    if (email && !existingUserIdentifier) {
      const ident = await this.identifierRepo.create({
        auth,
        type: IdentifierType.EMAIL,
        value: email,
        isVerified: this.options.forceVerificationOnGoogleSignup ? false : (payload.email_verified || false),
        source: IdentifierSource.GOOGLE,
        verifiedBy: payload.email_verified ? 'PROVIDER' : undefined,
      });
      identifiers.push(await this.identifierRepo.save(ident));
    }

    const oauthProvider = await this.oauthProviderRepo.create({
      auth,
      provider: OAuthProviderType.GOOGLE,
      providerUserId: googleId,
      rawProfile: payload,
      displayName: payload.name,
      avatarUrl: payload.picture,
      emailVerified: payload.email_verified,
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
    });
    const savedOauthProvider = await this.oauthProviderRepo.save(oauthProvider);

    auth.identifiers = identifiers;
    auth.oauthProviders = [savedOauthProvider];

    return {
      auth,
      identifier: auth.identifiers?.[0] || existingUserIdentifier || undefined,
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
    if (!dto.token) {
      throw new BadRequestException('Google ID token is required');
    }

    const payload = await this.verifyToken(dto.token);

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();

    const result = await this.oauthProviderRepo.findWithAuthByProviderUserId(OAuthProviderType.GOOGLE, googleId);

    if (!result || !result.auth) {
      throw new BadRequestException(
        'No account found linked to this Google account. Please sign up.',
      );
    }

    const oauthProvider = result.provider;
    const auth = result.auth;

    oauthProvider.rawProfile = payload;
    oauthProvider.displayName = payload.name ?? null;
    oauthProvider.avatarUrl = payload.picture ?? null;
    oauthProvider.emailVerified = payload.email_verified ?? false;

    auth.lastUsedAt = new Date();

    let identifier: AuthIdentifier | null = null;

    if (email) {
      const idResult = await this.identifierRepo.findWithAuthByValue(email);
      
      // If the email exists but belongs to a different user, we skip updating it
      // to avoid a unique constraint violation.
      if (idResult && idResult.auth?.id !== auth.id) {
        identifier = null; 
      } else {
        identifier = idResult?.identifier || null;

        if (!identifier) {
          identifier = await this.identifierRepo.create({
            auth,
            type: IdentifierType.EMAIL,
            value: email,
            isVerified: false,
          });
        }

        identifier.value = email;
        if (!this.options.forceVerificationOnGoogleLogin) {
          identifier.isVerified = payload.email_verified ?? false;
        }
        identifier.verifiedBy = payload.email_verified ? 'PROVIDER' : identifier.verifiedBy;
        identifier.source = IdentifierSource.GOOGLE;

        await this.identifierRepo.save(identifier);
      }
    }

    await this.oauthProviderRepo.save(oauthProvider);
    await this.authRepo.save(auth);

    const updatedAuth = await this.authRepo.findWithIdentifiers(auth.id);
    const updatedIdentifier = updatedAuth?.identifiers?.find(
      (i) => i.type === IdentifierType.EMAIL && i.value === email,
    ) || identifier;

    return {
      auth: updatedAuth || auth,
      identifier: updatedIdentifier || undefined,
    };
  }
}
