/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AuthStrategy } from '../auth-type.enum';

export class LoginDto {
  @ApiProperty({
    enum: AuthStrategy,
    example: AuthStrategy.LOCAL,
    description: 'Authentication method chosen by the user',
    type: () => AuthStrategy,
  })
  @IsEnum(AuthStrategy)
  method: AuthStrategy;

  @IsOptional()
  emailOrPhone?: string;

  @IsOptional()
  password?: string;

  // For google / otp
  @IsOptional()
  token?: string;
}
