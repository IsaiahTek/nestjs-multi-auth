import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum OtpPurpose {
  VERIFY_EMAIL = 'VERIFY_EMAIL', // For registration
  VERIFY_PHONE = 'VERIFY_PHONE', // For registration
  PASSWORD_RESET = 'PASSWORD_RESET', // For recovery
  LOGIN_2FA = 'LOGIN_2FA', // For logging in
}

@Entity('otp_tokens')
// Index makes lookup fast: "Find latest unused OTP for john@gmail.com"
@Index(['identifier', 'purpose', 'isUsed'])
export class OtpToken extends BaseEntity {
  // 1. NO Foreign Key to Auth.
  // We store the string directly so this works for users who don't exist yet.
  @Column()
  identifier: string; // "john@gmail.com" or "+1234567890"

  // 2. Purpose is crucial
  @Column({ type: 'enum', enum: OtpPurpose })
  purpose: OtpPurpose;

  // 3. SECURITY: NEVER store plain text codes.
  // Store: bcrypt.hash(code)
  @Column()
  codeHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  // Optional: If you want to track which user requested it (if they are logged in)
  // But make it nullable!
  @Column({ nullable: true })
  requestUserId?: string;
}
