import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthProviderRepository } from '../../../auth/interfaces/repositories.interface';
import { OAuthProvider as CoreOAuthProvider } from '../../../auth/interfaces/models.interface';
import { OAuthProvider } from '../entities/oauth-provider.entity';

@Injectable()
export class TypeOrmOAuthProviderRepository implements OAuthProviderRepository {
  constructor(
    @InjectRepository(OAuthProvider)
    private readonly repo: Repository<OAuthProvider>,
  ) {}

  async create(data: Partial<CoreOAuthProvider>): Promise<CoreOAuthProvider> {
    return this.repo.create(data);
  }

  async findByProviderUserId(provider: any, providerUserId: string): Promise<CoreOAuthProvider | null> {
    return this.repo.findOne({ where: { provider, providerUserId } });
  }

  async findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<{ provider: CoreOAuthProvider; auth: any } | null> {
    const result = await this.repo.findOne({
      where: { provider: provider as any, providerUserId },
      relations: ['auth', 'auth.identifiers'],
    });
    if (!result || !result.auth) return null;
    return { provider: result, auth: result.auth };
  }

  async save(provider: CoreOAuthProvider): Promise<CoreOAuthProvider> {
    return this.repo.save(provider);
  }

  async update(id: string, data: Partial<CoreOAuthProvider>): Promise<void> {
    await this.repo.update(id, data);
  }
}
