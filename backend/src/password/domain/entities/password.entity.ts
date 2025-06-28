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
  password: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'last_modified_date' })
  lastModifiedDate: Date;

  @Column({name: 'user_id'})
  userId: string;

  @ManyToMany(() => Tag, tag => tag.passwords, { cascade: true })
  @JoinTable({
    name: 'password_tags',
    joinColumn: { name: 'password_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
  })
  tags: Tag[];

  @Column({ nullable: true })
  url?: string;

  @Column({ nullable: true })
  notes?: string;
} 