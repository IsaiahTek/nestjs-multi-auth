import { MfaType } from '../entities/mfa-method.entity';
export declare class EnrollMfaDto {
    type: MfaType;
}
export declare class ActivateMfaDto {
    type: MfaType;
    code: string;
}
