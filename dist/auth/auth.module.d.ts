import { DynamicModule } from '@nestjs/common';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthModuleAsyncOptions } from './interfaces/auth-module-async-options.interface';
export declare class AuthModule {
    static register(options: AuthModuleOptions): DynamicModule;
    private static createProviders;
    static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule;
}
export { AUTH_MODULE_OPTIONS };
