import { Repository } from 'typeorm';
import { OAuthProviderRepository } from '../../../auth/interfaces/repositories.interface';
import { OAuthProvider as CoreOAuthProvider } from '../../../auth/interfaces/models.interface';
import { OAuthProvider } from '../entities/oauth-provider.entity';
export declare class TypeOrmOAuthProviderRepository implements OAuthProviderRepository {
    private readonly repo;
    constructor(repo: Repository<OAuthProvider>);
    create(data: Partial<CoreOAuthProvider>): Promise<CoreOAuthProvider>;
    findByProviderUserId(provider: any, providerUserId: string): Promise<CoreOAuthProvider | null>;
    findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<{
        provider: CoreOAuthProvider;
        auth: any;
    } | null>;
    save(provider: CoreOAuthProvider): Promise<CoreOAuthProvider>;
    update(id: string, data: Partial<CoreOAuthProvider>): Promise<void>;
}
