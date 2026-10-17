import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { LoginDto } from '../../dto/requests/login.dto';
import { SignupDto } from '../../dto/requests/signup.dto';
import { Auth, OAuthProvider, AuthIdentifier } from '../../interfaces/models.interface';
import { IdentifierSource, IdentifierType } from '../../enums/identifier-type.enum';
import { AuthStrategy, OAuthProviderType } from '../../enums/auth-type.enum';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { randomUUID, createHmac } from 'crypto';
import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN } from '../../interfaces/repository-tokens';
import { AuthRepository, AuthIdentifierRepository, OAuthProviderRepository } from '../../interfaces/repositories.interface';

@Injectable()
export class FacebookAuthStrategy implements IOAuthStrategy {
    constructor(
        @Inject(AUTH_REPOSITORY_TOKEN) private authRepo: AuthRepository,
        @Inject(AUTH_IDENTIFIER_REPOSITORY_TOKEN) private identifierRepo: AuthIdentifierRepository,
        @Inject(OAUTH_PROVIDER_REPOSITORY_TOKEN) private oauthProviderRepo: OAuthProviderRepository,
        @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    ) { }

    private async verifyToken(token: string) {
        try {
            // Create App Secret Proof for security if secret is provided
            let appSecretProof = '';
            if (this.options.facebookAppSecret) {
                appSecretProof = createHmac('sha256', this.options.facebookAppSecret)
                    .update(token)
                    .digest('hex');
            }

            const url = `https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${token}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                throw new BadRequestException(`Facebook error: ${data.error.message}`);
            }

            if (!data.id) {
                throw new BadRequestException('Invalid Facebook token payload');
            }

            return data;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException('Failed to verify Facebook token');
        }
    }

    async registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        if (!dto.token) {
            throw new BadRequestException('Facebook access token is required');
        }

        const payload = await this.verifyToken(dto.token);
        const facebookId = payload.id;
        const email = payload.email?.toLowerCase();

        const providerWithAuth = await this.oauthProviderRepo.findWithAuthByProviderUserId(OAuthProviderType.FACEBOOK, facebookId);

        if (providerWithAuth) {
            if (providerWithAuth.auth) {
                if (uid && providerWithAuth.auth.uid === uid) {
                    throw new BadRequestException('This Facebook account is already linked to your account');
                }
                throw new BadRequestException('This Facebook account is already linked to a user');
            } else {
                if (this.oauthProviderRepo.delete) {
                    await this.oauthProviderRepo.delete(providerWithAuth.provider.id);
                } else if (this.oauthProviderRepo.deleteByAuthId && (providerWithAuth.provider as any).authId) {
                    await this.oauthProviderRepo.deleteByAuthId((providerWithAuth.provider as any).authId);
                }
            }
        } else {
            const existingProvider = await this.oauthProviderRepo.findByProviderUserId(OAuthProviderType.FACEBOOK, facebookId);
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
                        throw new BadRequestException('A user with this email already exists');
                    }
                } else {
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
            isVerified: true, // Facebook verifies emails
            isPrimary: isFirstMethod,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const identifiers: AuthIdentifier[] = [];
        if (email && !existingUserIdentifier) {
            identifiers.push(
                await this.identifierRepo.create({
                    auth: newAuth,
                    type: IdentifierType.EMAIL,
                    value: email,
                    isVerified: true,
                    source: IdentifierSource.FACEBOOK,
                    verifiedBy: 'PROVIDER',
                })
            );
        }

        newAuth.identifiers = identifiers;

        const oauthProvider = await this.oauthProviderRepo.create({
            auth: newAuth,
            provider: OAuthProviderType.FACEBOOK,
            providerUserId: facebookId,
            expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
            rawProfile: payload,
            emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
            displayName: payload.name,
            avatarUrl: payload.picture,
        });

        newAuth.oauthProviders = [oauthProvider];

        const savedAuth = await this.authRepo.save(newAuth);
        return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] || existingUserIdentifier || undefined };
    }

    async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        if (!dto.token) {
            throw new BadRequestException('Facebook access token is required');
        }

        const payload = await this.verifyToken(dto.token);
        const facebookId = payload.id;

        const result = await this.oauthProviderRepo.findWithAuthByProviderUserId(OAuthProviderType.FACEBOOK, facebookId);

        if (!result || !result.auth) {
            throw new BadRequestException('No account found linked to this Facebook account');
        }

        const oauthProvider = result.provider;
        const auth = result.auth;
        
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);

        const email = payload.email?.toLowerCase();
        
        const updatedAuth = await this.authRepo.findWithIdentifiers(auth.id);
        const identifier = updatedAuth?.identifiers?.find(id => id.value === email);

        return { auth: updatedAuth || auth, identifier: identifier || undefined };
    }
}
