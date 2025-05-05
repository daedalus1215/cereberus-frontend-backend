export class PasswordResponseDto {
  id: number;
  name: string;
  username: string;
  password: string; // decrypted
  created_date: Date;
  last_modified_date: Date;
  tagIds: number[];

  constructor(partial: Partial<PasswordResponseDto>) {
    Object.assign(this, partial);
  }
} 