import { Tag } from "src/password/domain/entities/tag.entity";

export class PasswordResponseDto {
  id: number;
  name: string;
  username: string;
  password: string; // decrypted
  created_date: Date;
  last_modified_date: Date;
  tags: Tag[];

  constructor(partial: Partial<PasswordResponseDto>) {
    Object.assign(this, partial);
  }
} 