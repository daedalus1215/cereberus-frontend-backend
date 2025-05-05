import { IsString, IsOptional, IsArray, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';

export class UpdatePasswordDto {
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
} 