import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Link to the Identity UID.
  @Column()
  @Index()
  uid: string;

  // We store a HASH of the refresh token, not the plain token.
  // If the DB is leaked, attackers cannot generate new access tokens.
  @Column({ select: false }) // Do not return in standard queries
  refreshTokenHash: string;

  // Useful for displaying "Active Devices" in UI
  @Column({ nullable: true })
  userAgent: string; // e.g., "Mozilla/5.0... Chrome..."

  // Stable, hashed fingerprint used for enforcement
  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
