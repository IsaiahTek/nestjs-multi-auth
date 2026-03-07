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
import { randomUUID, createHmac } from 'crypto';

@Injectable()
export class FacebookAuthStrategy implements IOAuthStrategy {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Auth) private authRepo: Repository<Auth>,
        @InjectRepository(OAuthProvider) private oauthProviderRepo: Repository<OAuthProvider>,
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

        return this.dataSource.transaction(async (manager) => {
            const authRepo = manager.getRepository(Auth);
            const oauthProviderRepo = manager.getRepository(OAuthProvider);
            const identifierRepo = manager.getRepository(AuthIdentifier);

            // Check if this Facebook account is already linked
            const existingProvider = await oauthProviderRepo.findOne({
                where: { provider: OAuthProviderType.FACEBOOK, providerUserId: facebookId },
                relations: ['auth'],
            });

            if (existingProvider) {
                throw new BadRequestException('This Facebook account is already linked to a user');
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
                isVerified: true, // Facebook verifies emails
                isPrimary: true,
            });

            const identifiers: AuthIdentifier[] = [];
            if (email) {
                identifiers.push(
                    identifierRepo.create({
                        type: IdentifierType.EMAIL,
                        value: email,
                        isVerified: true,
                    })
                );
            }

            newAuth.identifiers = identifiers;

            const oauthProvider = oauthProviderRepo.create({
                provider: OAuthProviderType.FACEBOOK,
                providerUserId: facebookId,
            });

            newAuth.oauthProvider = oauthProvider;

            const savedAuth = await authRepo.save(newAuth);
            return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
        });
    }

    async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        if (!dto.token) {
            throw new BadRequestException('Facebook access token is required');
        }

        const payload = await this.verifyToken(dto.token);
        const facebookId = payload.id;

        const oauthProvider = await this.oauthProviderRepo.findOne({
            where: { provider: OAuthProviderType.FACEBOOK, providerUserId: facebookId },
            relations: ['auth', 'auth.identifiers'],
        });

        if (!oauthProvider || !oauthProvider.auth) {
            throw new BadRequestException('No account found linked to this Facebook account');
        }

        const auth = oauthProvider.auth;
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);

        const email = payload.email?.toLowerCase();
        const identifier = auth.identifiers?.find(id => id.value === email);

        return { auth, identifier };
    }
}
