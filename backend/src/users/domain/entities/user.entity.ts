import { Entity, Column } from "typeorm";
import { BaseEntity } from "src/shared-kernel/domain/entities/base.entity";

@Entity()
export class User extends BaseEntity {
  @Column({ unique: true, length: 20 })
  username: string;

  @Column({ length: 100 })
  password: string;
}
