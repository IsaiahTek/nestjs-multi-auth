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
}