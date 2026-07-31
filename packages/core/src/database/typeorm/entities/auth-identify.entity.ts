import {
  Entity,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Auth } from './auth.entity';
import { BaseEntity } from './base.entity';
import { AuthStrategy, OAuthProviderType } from '../../../auth/enums/auth-type.enum';

import { IdentifierType, IdentifierSource } from '../../../auth/enums/identifier-type.enum';

@Entity('auth_identifiers')
export class AuthIdentifier extends BaseEntity {

  @ManyToOne(() => Auth, (auth) => auth.identifiers, { onDelete: 'CASCADE' })
  auth: Auth;

  @Column({ type: 'enum', enum: IdentifierType })
  type: IdentifierType;

  // The login string: "john@example.com" or "+123456789"
  // MUST be unique system-wide so we know exactly which User/Auth to pull.
  @Index({ unique: true })
  @Column()
  value: string;

  @Column({ default: false })
  isVerified: boolean; // e.g., Email confirmed?

  /**
   * Who issued this identifier
   */
  @Column({
    type: 'enum',
    enum: IdentifierSource,
    default: IdentifierSource.LOCAL,
  })
  source: IdentifierSource;

  /**
   * Optional: how it was verified
   */
  @Column({ nullable: true })
  verifiedBy?: 'OTP' | 'PROVIDER' | 'ADMIN';

  toMap() {
    return {
      id: this.id,
      type: this.type,
      value: this.value,
      isVerified: this.isVerified,
      // auth: this.auth.toMap(),
    };
  }
}
