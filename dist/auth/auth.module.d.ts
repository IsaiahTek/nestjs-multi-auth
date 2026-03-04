import { DynamicModule } from '@nestjs/common';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
export declare class AuthModule {
    static register(options: AuthModuleOptions): DynamicModule;
}
export { AUTH_MODULE_OPTIONS };
