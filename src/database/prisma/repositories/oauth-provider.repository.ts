import { Injectable, Inject } from '@nestjs/common';
import { OAuthProviderRepository } from '../../../auth/interfaces/repositories.interface';
import { OAuthProvider as CoreOAuthProvider, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';

@Injectable()
export class PrismaOAuthProviderRepository implements OAuthProviderRepository {
  constructor(@Inject('PRISMA_SERVICE_TOKEN') private readonly prisma: any) {}

  async create(data: Partial<CoreOAuthProvider>): Promise<CoreOAuthProvider> {
    const { auth, ...rest } = data;
    const createData: any = { ...rest };
    if (auth && auth.id) createData.authId = auth.id;
    return this.prisma.oAuthProvider.create({ data: createData });
  }
  async findByProviderUserId(provider: string, providerUserId: string): Promise<CoreOAuthProvider | null> { return this.prisma.oAuthProvider.findUnique({ where: { providerUserId } }); }
  
  async findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<{ provider: CoreOAuthProvider; auth: CoreAuth } | null> {
    const res = await this.prisma.oAuthProvider.findUnique({ where: { providerUserId }, include: { auth: true } });
    if (!res) return null;
    const { auth, ...prov } = res;
    return { provider: prov as any, auth: auth as any };
  }

  async save(provider: CoreOAuthProvider): Promise<CoreOAuthProvider> { 
    const { auth, ...rest } = provider as any;
    return this.prisma.oAuthProvider.update({ where: { id: provider.id }, data: rest }); 
  }
  async update(id: string, data: Partial<CoreOAuthProvider>): Promise<void> { 
    const { auth, ...rest } = data as any;
    await this.prisma.oAuthProvider.update({ where: { id }, data: rest }); 
  }
}