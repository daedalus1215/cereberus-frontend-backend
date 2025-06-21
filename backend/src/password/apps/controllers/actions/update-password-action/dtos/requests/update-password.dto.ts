import { IsString, IsOptional, IsArray, ArrayNotEmpty, ArrayUnique, IsInt, IsNotEmpty } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  tagIds?: number[];

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  notes?: string;
} 