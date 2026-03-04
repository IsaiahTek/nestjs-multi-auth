import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum MfaType {
  TOTP = 'TOTP', // Authenticator App
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

@Entity('auth_mfa_methods')
export class MfaMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: MfaType })
  type: MfaType;

  // The secret key for TOTP or the target phone number for SMS
  // RECOMMENDATION: Encrypt this column at rest!
  @Column({ select: false })
  secret: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  toMap() {
    return {
      id: this.id,
      type: this.type,
      isEnabled: this.isEnabled,
      isDefault: this.isDefault,
      lastUsedAt: this.lastUsedAt,
      createdAt: this.createdAt,
    };
  }
}
