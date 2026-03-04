import { DynamicModule } from '@nestjs/common';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
export declare class AuthModule {
    static register(options: AuthModuleOptions): DynamicModule;
}
