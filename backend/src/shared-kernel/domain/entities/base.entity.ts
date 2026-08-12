import {
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Entity,
} from "typeorm";

@Entity()
export class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // ⚠️ was type: "text" "for SQLite compatibility" — on Postgres that stores timestamps as
  // TEXT, which cannot be compared, sorted or indexed as a date. timestamptz per D22.
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: string;
}
