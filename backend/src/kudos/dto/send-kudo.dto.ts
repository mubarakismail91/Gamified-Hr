import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const KUDO_VALUES = ['collaboration', 'excellence', 'initiative', 'mentorship', 'service', 'integrity'] as const;

export class SendKudoDto {
  @IsString()
  toUserId!: string;

  @IsIn(KUDO_VALUES)
  value!: (typeof KUDO_VALUES)[number];

  @IsString()
  @MinLength(8)
  @MaxLength(280)
  message!: string;
}
