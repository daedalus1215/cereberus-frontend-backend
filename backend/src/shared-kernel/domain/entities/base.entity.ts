import { CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Entity } from 'typeorm';

@Entity()
export class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })  // Use 'text' for SQLite compatibility
  createdAt: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })  // Use 'text' for SQLite compatibility
  updatedAt: string;
}
