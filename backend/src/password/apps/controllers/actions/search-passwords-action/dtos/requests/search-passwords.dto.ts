import { IsOptional, IsString } from "class-validator";

export class SearchPasswordsDto {
  @IsOptional()
  @IsString()
  query?: string;
}
