import { BaseEntity } from './base.entity';
import { MfaType } from '../../../auth/enums/mfa-type.enum';
export declare class MfaMethod extends BaseEntity {
    uid: string;
    type: MfaType;
    secret: string;
    isEnabled: boolean;
    isDefault: boolean;
    lastUsedAt: Date;
}
