import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Password } from './password.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  user_id: number;

  @ManyToMany(() => Password, password => password.tags)
  passwords!: Password[];
} 