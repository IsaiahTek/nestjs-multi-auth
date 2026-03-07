import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MfaType } from '../entities/mfa-method.entity';

export class EnrollMfaDto {
    @ApiProperty({
        description: 'The type of MFA to enroll (e.g., TOTP)',
        enum: MfaType,
        example: MfaType.TOTP,
    })
    @IsNotEmpty()
    @IsEnum(MfaType)
    type: MfaType;
}

export class ActivateMfaDto {
    @ApiProperty({
        description: 'The type of MFA to activate',
        enum: MfaType,
        example: MfaType.TOTP,
    })
    @IsNotEmpty()
    @IsEnum(MfaType)
    type: MfaType;

    @ApiProperty({
        description: 'The verification code from the MFA app',
        example: '123456',
    })
    @IsNotEmpty()
    @IsString()
    code: string;
}
