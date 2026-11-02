import { IsIn } from 'class-validator';

export class FollowPathDto {
  @IsIn(['teaching', 'research', 'leadership', 'digital'])
  branch!: 'teaching' | 'research' | 'leadership' | 'digital';
}
