import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5c...',
        description: 'The refresh token (required if not using cookies)',
        required: false,
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    refreshToken?: string;
}
