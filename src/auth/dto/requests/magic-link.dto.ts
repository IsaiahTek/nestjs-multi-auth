import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class MagicLinkVerifyDto {
  @ApiProperty({ example: 'secure-magic-token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
