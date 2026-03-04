import { Entity, Column, ManyToOne, OneToMany, Index, OneToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from './base.entity';
import { AuthIdentifier } from './auth-identify.entity';
import { OAuthProvider } from './oauth-provider.entity';
import { AuthStrategy } from '../auth-type.enum';

@Entity('auth')
@Index('IDX_user_primary_auth', ['userId'], {
  unique: true,
  where: `"isPrimary" = true`,
})
@Index(['strategy'])
@Index(['isActive'])
export class Auth extends BaseEntity {
  /* ------------------------------------------------------------------
   * Relationships
   * ------------------------------------------------------------------ */

  @ApiProperty({
    description: 'ID of the user this authentication method belongs to',
    type: 'string',
    example: 'uuid-string',
  })
  @Column()
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: AuthStrategy })
  strategy: AuthStrategy;

  /* ------------------------------------------------------------------
   * Identity & Secrets
   * ------------------------------------------------------------------ */

  /*
   * THE LOOKUPS:
   * Links "john@gmail.com" or "john_doe" to this specific Auth row.
   */
  @OneToMany(() => AuthIdentifier, (identifier) => identifier.auth, {
    cascade: true,
  })
  identifiers: AuthIdentifier[];

  /*
   * FOR LOCAL STRATEGY:
   * Stores the password hash.
   */
  @ApiProperty({
    example: '$2b$10$hashedpassword...',
    description: 'Hashed secret (password, TOTP secret). Null for OAuth',
    nullable: true,
  })
  @Column({ nullable: true, select: false })
  secretHash?: string;

  /* ------------------------------------------------------------------
   * Flags & Status
   * ------------------------------------------------------------------ */

  @ApiProperty({
    example: true,
    description: 'Primary login method for the user',
  })
  @Column({ default: false })
  isPrimary: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether the identifier is verified',
  })
  @Column({ default: false })
  isVerified: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether this auth method is enabled',
  })
  @Column({ default: true })
  isActive: boolean;

  /* ------------------------------------------------------------------
   * Metadata & Usage
   * ------------------------------------------------------------------ */

  @ApiProperty({
    example: { device: 'iPhone', ip: '192.168.1.1' },
    description: 'Additional metadata (JSON)',
  })
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @ApiProperty({
    example: '2025-09-30T12:00:00Z',
    description: 'Last successful usage timestamp',
  })
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  /* ------------------------------------------------------------------
   * OAuth & OTP
   * ------------------------------------------------------------------ */

  @ApiProperty({
    type: () => OAuthProvider,
    description: 'OAuth provider details (only for OAUTH method)',
    required: false,
  })
  @OneToOne(() => OAuthProvider, (provider) => provider.auth, {
    cascade: true,
    nullable: true,
  })
  oauthProvider?: OAuthProvider;

  toMap() {
    return {
      id: this.id,
      strategy: this.strategy,
      isActive: this.isActive,
      isVerified: this.isVerified,
      isPrimary: this.isPrimary,
      meta: this.meta,
      lastUsedAt: this.lastUsedAt,
      // user: this.user.toMap(),
      identifiers: this.identifiers.map((id) => id.toMap()),
      oauthProvider: this.oauthProvider?.toMap(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
