import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from '../../dto/login.dto';
import { SignupDto } from '../../dto/signup.dto';
import { Auth } from '../../entities/auth.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';
import { AuthIdentifier, IdentifierType } from '../../entities/auth-identify.entity';
import { AuthStrategy, OAuthProviderType } from '../../auth-type.enum';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { IOAuthStrategy } from './oauth-strategy.interface';
import { randomUUID, createPublicKey } from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AppleAuthStrategy implements IOAuthStrategy {
    private applePublicKeys: any[] = [];
    private lastKeysFetch = 0;

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Auth) private authRepo: Repository<Auth>,
        @InjectRepository(OAuthProvider) private oauthProviderRepo: Repository<OAuthProvider>,
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

        return this.dataSource.transaction(async (manager) => {
            const authRepo = manager.getRepository(Auth);
            const oauthProviderRepo = manager.getRepository(OAuthProvider);
            const identifierRepo = manager.getRepository(AuthIdentifier);

            // Check if this Apple account is already linked
            const existingProvider = await oauthProviderRepo.findOne({
                where: { provider: OAuthProviderType.APPLE, providerUserId: appleId },
                relations: ['auth'],
            });

            if (existingProvider) {
                throw new BadRequestException('This Apple account is already linked to a user');
            }

            // Check if email identifier is already taken
            if (email) {
                const existingIdentifier = await identifierRepo.findOne({
                    where: { value: email, type: IdentifierType.EMAIL },
                });
                if (existingIdentifier) {
                    throw new BadRequestException('A user with this email already exists');
                }
            }

            const identityUid = uid || randomUUID();

            const newAuth = authRepo.create({
                uid: identityUid,
                strategy: AuthStrategy.OAUTH,
                isActive: true,
                isVerified: payload.email_verified === 'true' || payload.email_verified === true,
                isPrimary: true,
            });

            const identifiers: AuthIdentifier[] = [];
            if (email) {
                identifiers.push(
                    identifierRepo.create({
                        type: IdentifierType.EMAIL,
                        value: email,
                        isVerified: payload.email_verified === 'true' || payload.email_verified === true,
                    })
                );
            }

            newAuth.identifiers = identifiers;

            const oauthProvider = oauthProviderRepo.create({
                provider: OAuthProviderType.APPLE,
                providerUserId: appleId,
            });

            newAuth.oauthProvider = oauthProvider;

            const savedAuth = await authRepo.save(newAuth);
            return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
        });
    }

    async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        if (!dto.token) {
            throw new BadRequestException('Apple ID token is required');
        }

        const payload = await this.verifyToken(dto.token);
        const appleId = payload.sub;

        const oauthProvider = await this.oauthProviderRepo.findOne({
            where: { provider: OAuthProviderType.APPLE, providerUserId: appleId },
            relations: ['auth', 'auth.identifiers'],
        });

        if (!oauthProvider || !oauthProvider.auth) {
            throw new BadRequestException('No account found linked to this Apple account');
        }

        const auth = oauthProvider.auth;
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);

        const email = payload.email?.toLowerCase();
        const identifier = auth.identifiers?.find(id => id.value === email);

        return { auth, identifier };
    }
}
