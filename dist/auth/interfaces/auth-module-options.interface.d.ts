import { Type, DynamicModule, ForwardReference } from '@nestjs/common';
import { AuthTransport } from '../auth-type.enum';
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
export interface AuthModuleOptions {
    jwtSecret: string;
    jwtExpiresIn?: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiresIn?: string;
    imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;
    disableController?: boolean;
    transport?: AuthTransport[];
    disableGlobalGuard?: boolean;
}
