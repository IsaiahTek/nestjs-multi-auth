import { OAuthProviderRepository } from '../../../auth/interfaces/repositories.interface';
import { OAuthProvider as CoreOAuthProvider, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
export declare class PrismaOAuthProviderRepository implements OAuthProviderRepository {
    private readonly prisma;
    constructor(prisma: any);
    create(data: Partial<CoreOAuthProvider>): Promise<CoreOAuthProvider>;
    findByProviderUserId(provider: string, providerUserId: string): Promise<CoreOAuthProvider | null>;
    findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<{
        provider: CoreOAuthProvider;
        auth: CoreAuth;
    } | null>;
    save(provider: CoreOAuthProvider): Promise<CoreOAuthProvider>;
    update(id: string, data: Partial<CoreOAuthProvider>): Promise<void>;
}
