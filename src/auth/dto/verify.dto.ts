import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDto {
    @ApiProperty({
        description: 'The unique identity ID (UID) being verified',
        example: 'uuid-string',
    })
    @IsNotEmpty()
    @IsUUID()
    uid: string;

    @ApiProperty({
        description: 'The verification code sent via email or phone',
        example: '123456',
    })
    @IsNotEmpty()
    @IsString()
    code: string;
}

export class ResendVerificationDto {
    @ApiProperty({
        description: 'The unique identity ID (UID) to resend the code for',
        example: 'uuid-string',
    })
    @IsNotEmpty()
    @IsUUID()
    uid: string;
}
