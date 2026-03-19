import { AuthModuleOptions } from "./auth-module-options.interface";
export interface AuthModuleAsyncOptions {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<AuthModuleOptions> | AuthModuleOptions;
}
