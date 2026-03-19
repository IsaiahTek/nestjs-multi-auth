import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AuthIdentifierDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  type: string;

  @Expose()
  @ApiProperty()
  value: string;

  @Expose()
  @ApiProperty()
  isVerified: boolean;

  @Expose()
  @ApiProperty()
  source: string;

  @Expose()
  @ApiProperty()
  verifiedBy: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}