import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { LoginDto } from '../../dto/requests/login.dto';
import { SignupDto } from '../../dto/requests/signup.dto';
import { Auth, OAuthProvider, AuthIdentifier } from '../../interfaces/models.interface';
import { IdentifierSource, IdentifierType } from '../../enums/identifier-type.enum';
import { AuthStrategy, OAuthProviderType } from '../../enums/auth-type.enum';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { randomUUID, createPublicKey } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AUTH_REPOSITORY_TOKEN, AUTH_IDENTIFIER_REPOSITORY_TOKEN, OAUTH_PROVIDER_REPOSITORY_TOKEN } from '../../interfaces/repository-tokens';
import { AuthRepository, AuthIdentifierRepository, OAuthProviderRepository } from '../../interfaces/repositories.interface';

@Injectable()
export class AppleAuthStrategy implements IOAuthStrategy {
    private applePublicKeys: any[] = [];
    private lastKeysFetch = 0;

    constructor(
        @Inject(AUTH_REPOSITORY_TOKEN) private authRepo: AuthRepository,
        @Inject(AUTH_IDENTIFIER_REPOSITORY_TOKEN) private identifierRepo: AuthIdentifierRepository,
        @Inject(OAUTH_PROVIDER_REPOSITORY_TOKEN) private oauthProviderRepo: OAuthProviderRepository,
        @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    ) { }

    private async getApplePublicKeys() {
        // Cache keys for 24 hours
        const now = Date.now();
        if (this.applePublicKeys.length > 0 && now - this.lastKeysFetch < 24 * 60 * 60 * 1000) {
            return this.applePublicKeys;
        }

        try {
            const response = await fetch('https://appleid.apple.com/auth/keys');
            const data = await response.json();
            this.applePublicKeys = data.keys;
            this.lastKeysFetch = now;
            return this.applePublicKeys;
        } catch (error) {
            throw new BadRequestException('Failed to fetch Apple public keys');
        }
    }

    private async verifyToken(token: string) {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.header || !decoded.header.kid) {
                throw new BadRequestException('Invalid Apple token header');
            }

            const keys = await this.getApplePublicKeys();
            const jwk = keys.find(k => k.kid === decoded.header.kid);

            if (!jwk) {
                throw new BadRequestException('Apple public key not found');
            }

            // Using Node.js native crypto to convert JWK to PublicKey object
            const publicKey = createPublicKey({
                key: jwk,
                format: 'jwk',
            });

            const payload = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
                audience: this.options.appleClientId,
                issuer: 'https://appleid.apple.com',
            }) as any;

            if (!payload || !payload.sub) {
                throw new BadRequestException('Invalid Apple token payload');
            }

            return payload;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Apple token verification failed: ${error.message}`);
        }
    }

    async registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        if (!dto.token) {
            throw new BadRequestException('Apple ID token is required');
        }

        const payload = await this.verifyToken(dto.token);
        const appleId = payload.sub;
        const email = payload.email?.toLowerCase();

        const existingProvider = await this.oauthProviderRepo.findByProviderUserId(OAuthProviderType.APPLE, appleId);

        if (existingProvider) {
            throw new BadRequestException('This Apple account is already linked to a user');
        }

        if (email) {
            const existingIdentifier = await this.identifierRepo.findByValue(email);
            if (existingIdentifier) {
                throw new BadRequestException('A user with this email already exists');
            }
        }

        const identityUid = uid || randomUUID();

        const newAuth = await this.authRepo.create({
            uid: identityUid,
            strategy: AuthStrategy.OAUTH,
            isActive: true,
            isVerified: payload.email_verified === 'true' || payload.email_verified === true,
            isPrimary: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const identifiers: AuthIdentifier[] = [];
        if (email) {
            identifiers.push(
                await this.identifierRepo.create({
                    auth: newAuth,
                    type: IdentifierType.EMAIL,
                    value: email,
                    isVerified: payload.email_verified === 'true' || payload.email_verified === true,
                    source: IdentifierSource.APPLE,
                    verifiedBy: payload.email_verified ? 'PROVIDER' : undefined,
                })
            );
        }

        newAuth.identifiers = identifiers;

        const oauthProvider = await this.oauthProviderRepo.create({
            auth: newAuth,
            provider: OAuthProviderType.APPLE,
            providerUserId: appleId,
            expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
            rawProfile: payload,
            emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
            displayName: payload.name?.displayName,
            avatarUrl: payload.picture,
        });

        newAuth.oauthProviders = [oauthProvider];

        const savedAuth = await this.authRepo.save(newAuth);
        return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
    }

    async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        if (!dto.token) {
            throw new BadRequestException('Apple ID token is required');
        }

        const payload = await this.verifyToken(dto.token);
        const appleId = payload.sub;

        const result = await this.oauthProviderRepo.findWithAuthByProviderUserId(OAuthProviderType.APPLE, appleId);

        if (!result || !result.auth) {
            throw new BadRequestException('No account found linked to this Apple account');
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
