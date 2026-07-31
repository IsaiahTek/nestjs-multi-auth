import {
  Entity,
  Column,
  Index,
} from 'typeorm';

import { BaseEntity } from './base.entity';
import { MfaType } from '../../../auth/enums/mfa-type.enum';

@Entity('auth_mfa_methods')
export class MfaMethod extends BaseEntity {
  @Column()
  @Index()
  uid: string;

  @Column({ type: 'enum', enum: MfaType })
  type: MfaType;

  // The secret key for TOTP or the target phone number for SMS
  // RECOMMENDATION: Encrypt this column at rest!
  @Column({ select: false })
  secret: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  lastUsedAt: Date;

}
