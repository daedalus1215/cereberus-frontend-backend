import {
  IsString,
  IsOptional,
  IsArray,
  ArrayUnique,
  IsInt,
} from "class-validator";

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
