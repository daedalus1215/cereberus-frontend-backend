import { IsString, IsNotEmpty, IsArray, IsOptional, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';

export class AddPasswordDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  tagIds?: number[];
} 