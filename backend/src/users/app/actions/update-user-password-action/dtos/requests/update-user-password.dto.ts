import { IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

export class UpdateUserPasswordDto {
  @IsString()
  @IsNotEmpty()
  readonly currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  readonly newPassword: string;

  @IsString()
  @IsNotEmpty()
  readonly confirmPassword: string;
}
