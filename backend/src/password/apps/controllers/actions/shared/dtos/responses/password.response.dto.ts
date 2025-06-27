import { Tag } from "src/password/domain/entities/tag.entity";

export class PasswordResponseDto {
  id: number;
  name: string;
  username: string;
  password: string;
  createdDate: Date;
  lastModifiedDate: Date;
  tags: {id: number, name: string}[];
  url?: string;
  notes?: string;
  
  constructor(partial: Partial<PasswordResponseDto>) {
    Object.assign(this, partial);
  }
} 