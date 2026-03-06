/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AuthStrategy, OAuthProviderType } from '../auth-type.enum';

export class LoginDto {
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


  @IsOptional()
  emailOrPhone?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+2347035742844', required: false })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'john_doe', required: false })
  @IsOptional()
  username?: string;

  @IsOptional()
  password?: string;

  // For google / otp
  @IsOptional()
  token?: string;
}
