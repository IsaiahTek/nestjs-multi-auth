import { Type } from '@nestjs/common';
import { AuthTransport } from '../auth-type.enum';
import { AuthNotificationProvider } from './auth-notification-provider.interface';
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
export interface AuthModuleOptions {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn?: string;
    jwtRefreshExpiresIn?: string;
    disableGlobalGuard?: boolean;
    disableController?: boolean;
    transport?: AuthTransport | AuthTransport[];
    notificationProvider?: Type<AuthNotificationProvider>;
    verificationRequired?: boolean;
}
