import { Type } from '@nestjs/common';
import { AuthTransport, AuthStrategy } from '../auth-type.enum';
import { AuthNotificationProvider } from './auth-notification-provider.interface';
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
export interface AuthModuleOptions {
    jwtSecret: string;
    jwtRefreshSecret: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
    disableGlobalGuard?: boolean;
    disableController?: boolean;
    transport?: AuthTransport | AuthTransport[];
    notificationProvider?: Type<AuthNotificationProvider>;
    verificationRequired?: boolean;
    imports?: any[];
    googleClientId?: string;
    enabledStrategies?: AuthStrategy[];
    phoneRequiresPassword?: boolean;
    otpExpiresIn?: number;
    otpResendInterval?: number;
}
