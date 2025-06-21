import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Tag } from './tag.entity';

@Entity('passwords')
export class Password {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column()
  password: string; // encrypted

  @CreateDateColumn({ name: 'created_date' })
  created_date: Date;

  @UpdateDateColumn({ name: 'last_modified_date' })
  last_modified_date: Date;

  @Column()
  user_id: string;

  @ManyToMany(() => Tag, tag => tag.passwords, { cascade: true })
  @JoinTable({
    name: 'password_tags',
    joinColumn: { name: 'password_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
  })
  tags: Tag[];

  @Column({ nullable: true })
  url?: string;
} 