import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SecureAccountDto {
  @ApiProperty({ description: 'The signed token from the security email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
