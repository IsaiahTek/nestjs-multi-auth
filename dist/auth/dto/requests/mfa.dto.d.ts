import { MfaType } from '../../enums/mfa-type.enum';
export declare class EnrollMfaDto {
    type: MfaType;
}
export declare class ActivateMfaDto {
    type: MfaType;
    code: string;
}
export declare class VerifyMfaLoginDto {
    uid: string;
    code: string;
}
