import { ApiProperty } from '@nestjs/swagger';
import { AuthStrategy } from '../../enums/auth-type.enum';
import { Expose, Type } from 'class-transformer';
import { AuthIdentifierDto } from './identifier-response.dto';
import { OAuthProviderResponseDto } from './oauth-provider-response.dto';

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
    @Type(() => AuthIdentifierDto)
    identifiers?: AuthIdentifierDto[];

    @Expose()
    @Type(() => OAuthProviderResponseDto)
    @ApiProperty({ type: OAuthProviderResponseDto, required: false })
    oauthProvider?: OAuthProviderResponseDto;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}