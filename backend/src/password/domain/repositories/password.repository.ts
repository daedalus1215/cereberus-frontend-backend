import { Password } from '../entities/password.entity';

export type PasswordRepository = {
  findAllByUser(userId: number): Promise<Password[]>;
  findByIdAndUser(id: number, userId: number): Promise<Password | null>;
  save(password: Password): Promise<Password>;
  update(password: Password): Promise<Password>;
}; 