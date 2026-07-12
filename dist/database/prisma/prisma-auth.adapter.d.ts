import { DynamicModule } from '@nestjs/common';
export interface PrismaAuthAdapterOptions {
    /**
     * The injection token for your Prisma Service.
     * Default: 'PRISMA_SERVICE'
     */
    prismaServiceToken?: string | symbol | any;
}
export declare class PrismaAuthAdapter {
    static register(options?: PrismaAuthAdapterOptions): DynamicModule;
}
