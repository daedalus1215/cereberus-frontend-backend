import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

export type SecurityEventType =
  | "failed_login"
  | "disabled_registration_attempt";

@Entity("security_events")
export class SecurityEvent {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ name: "event_type", type: "varchar", length: 50 })
  eventType: SecurityEventType;

  @Column({ name: "metadata", type: "text", nullable: true })
  metadata: string;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;
}
