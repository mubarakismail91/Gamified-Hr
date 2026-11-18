import { IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password-policy';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword!: string;
}
