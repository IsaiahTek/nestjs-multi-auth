// oauth-provider-response.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthProviderResponseDto {
  @Expose()
  @ApiProperty()
  providerName: string;

  @Expose()
  @ApiProperty()
  providerId: string;
}