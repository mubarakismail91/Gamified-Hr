import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Bi } from '../../common/dto/staff-member.dto';

export class CreateSquadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  /** Employee creator: people to INVITE. Manager/admin creator: people to ADD directly. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  memberIds?: string[];
}

export class AddSquadMemberDto {
  @IsString()
  userId!: string;
}

export class CreateChallengeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  titleEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  @IsIn(['quests_completed', 'xp_earned'])
  metric!: 'quests_completed' | 'xp_earned';

  @IsInt()
  @Min(1)
  @Max(100000)
  target!: number;

  @IsInt()
  @Min(5)
  @Max(500)
  bonusXp!: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

// ---- responses ---------------------------------------------------------------

export interface SquadPersonDto {
  id: string;
  name: Bi;
  initials: string;
  avatarTone: string;
  department: Bi;
}

export interface SquadMemberDto {
  user: SquadPersonDto;
  status: 'invited' | 'active';
  joinedAt: Date | null;
}

export interface SquadDto {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: { id: string; name: Bi; role: 'employee' | 'manager' | 'admin' };
  members: SquadMemberDto[];
  activeCount: number;
  /** At least MIN_RANKED active members: shown on the team leaderboard and can join challenges. */
  ranked: boolean;
  /** Whether the viewer may add/remove members or disband it. */
  canManage: boolean;
}

export interface MySquadsDto {
  squad: SquadDto | null;
  invites: SquadDto[];
}

export interface SquadLeaderboardRowDto {
  position: number;
  squadId: string;
  name: string;
  memberCount: number;
  departmentCount: number;
  totalXp: number;
  avgXp: number;
  members: SquadPersonDto[];
  isMine: boolean;
}

export interface ChallengeDto {
  id: string;
  title: Bi;
  description: Bi;
  metric: 'quests_completed' | 'xp_earned';
  target: number;
  bonusXp: number;
  startsAt: Date;
  endsAt: Date;
  status: 'upcoming' | 'active' | 'ended';
  squadsJoined: number;
  squadsCompleted: number;
  /** The viewer's squad's entry, for employees in a squad. */
  mine: { joined: boolean; progress: number; completedAt: Date | null } | null;
}
