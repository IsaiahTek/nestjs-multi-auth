import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { SessionEvent } from '../../../auth/enums/session-event.enum';

@Entity('session_logs')
export class SessionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  sessionId: string;

  // Link to the Identity UID.
  @Column('uuid')
  @Index()
  uid: string;

  @Column({ nullable: true })
  @Index()
  namespace: string;

  @Column()
  event: SessionEvent;

  // Useful for displaying "Active Devices" in UI
  @Column({ nullable: true })
  userAgent: string; // e.g., "Mozilla/5.0... Chrome..."

  // Stable, hashed fingerprint used for enforcement
  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column()
  reason?: string;

  toMap() {
    return {
      id: this.id,
      uid: this.uid,
      sessionId: this.sessionId,
      event: this.event,
      userAgent: this.userAgent,
      deviceFingerprint: this.deviceFingerprint,
      ipAddress: this.ipAddress,
      timestamp: this.timestamp,
      reason: this.reason,
      namespace: this.namespace,
    };
  }
}
