import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from './base.entity';
import { Auth } from './auth.entity';
import { OAuthProviderType } from '../auth-type.enum';

@Entity()
export class OAuthProvider extends BaseEntity {
  @OneToOne(() => Auth, (auth) => auth.oauthProvider, { onDelete: 'CASCADE' })
  @JoinColumn()
  auth: Auth;

  @ApiProperty({ enum: OAuthProviderType, example: OAuthProviderType.GOOGLE })
  @Column({ type: 'enum', enum: OAuthProviderType })
  provider: OAuthProviderType;

  // The ID returned by Google/Apple (e.g. "sub" claim)
  @ApiProperty({ example: '1234567890' })
  @Column()
  providerUserId: string;

  @ApiProperty({ example: 'ya29.a0ARrdaM...' })
  @Column({ nullable: true, select: false })
  accessToken?: string;

  @ApiProperty({ example: '1//0gdf1234...' })
  @Column({ nullable: true, select: false })
  refreshToken?: string;

  @ApiProperty({ example: '2025-10-01T12:00:00Z' })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  toMap() {
    return {
      id: this.id,
      provider: this.provider,
      providerUserId: this.providerUserId,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      // auth: this.auth.toMap(),
    };
  }
}
