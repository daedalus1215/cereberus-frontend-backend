import { IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

export class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(20)
  readonly newUsername: string;

  @IsString()
  @IsNotEmpty()
  readonly currentPassword: string;
}
