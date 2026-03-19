import { ApiProperty } from '@nestjs/swagger';
import { AuthStrategy } from '../enums/auth-type.enum';
import { Expose } from 'class-transformer';

export class AuthResponseDto {
    @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  uid: string;

  @Expose()
  @ApiProperty({ enum: AuthStrategy })
  strategy: AuthStrategy;

  @Expose()
  @ApiProperty()
  isPrimary: boolean;

  @Expose()
  @ApiProperty()
  isVerified: boolean;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty({ required: false })
  meta?: Record<string, any>;

  @Expose()
  @ApiProperty({ required: false })
  lastUsedAt?: Date;

  @Expose()
  @ApiProperty({ required: false })
  identifiers?: any[];

  @Expose()
  @ApiProperty({ required: false })
  oauthProvider?: any;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;
}