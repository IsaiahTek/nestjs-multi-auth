// oauth-provider-response.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OAuthProviderType } from '../../enums/auth-type.enum';

export class OAuthProviderResponseDto {
  @Expose()
  @ApiProperty({ enum: OAuthProviderType })
  provider: OAuthProviderType;

  @Expose()
  @ApiProperty()
  providerUserId: string;

  @Expose()
  @ApiProperty()
  expiresAt?: Date;

  @Expose()
  @ApiProperty()
  displayName?: string;

  @Expose()
  @ApiProperty()
  avatarUrl?: string;

  @Expose()
  @ApiProperty()
  emailVerified?: boolean;

  @Expose()
  @ApiProperty()
  rawProfile?: Record<string, any>;
}