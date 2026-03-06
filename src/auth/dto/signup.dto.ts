/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
} from 'class-validator';
import { AuthStrategy, OAuthProviderType } from '../auth-type.enum';

export class SignupDto {
  @ApiProperty({
    enum: AuthStrategy,
    example: AuthStrategy.LOCAL,
    description: 'Authentication method chosen by the user',
    type: () => AuthStrategy,
  })
  @IsEnum(AuthStrategy)
  method: AuthStrategy;

  @ApiProperty({
    enum: OAuthProviderType,
    example: OAuthProviderType.GOOGLE,
    description: 'OAuth provider (required if method is OAUTH)',
    required: false,
  })
  @IsEnum(OAuthProviderType)
  @IsOptional()
  provider?: OAuthProviderType;


  @ApiProperty({ example: '+2347035742844', required: false })
  @IsPhoneNumber('NG')
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'john_doe', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'securePassword123', required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;

  /**
   * For OAuth / OTP verification
   */
  @IsOptional()
  @IsString()
  token?: string;
}
