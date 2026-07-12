import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MfaType } from '../../enums/mfa-type.enum';

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

export class VerifyMfaLoginDto {
    @ApiProperty({
        description: 'The user identity ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsNotEmpty()
    @IsString()
    uid: string;

    @ApiProperty({
        description: 'The verification code from the MFA app',
        example: '123456',
    })
    @IsNotEmpty()
    @IsString()
    code: string;
}
