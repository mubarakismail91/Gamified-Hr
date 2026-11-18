import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { DEMOGRAPHIC_DIMENSIONS, type DemographicDimension } from '../common/demographics';
import { SurveysService } from './surveys.service';
import { CreateSurveyRoundDto } from './dto/create-survey-round.dto';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('surveys')
export class SurveysController {
  constructor(private surveys: SurveysService) {}

  @Roles('admin')
  @Get()
  findAllRounds() {
    return this.surveys.findAllRounds();
  }

  @Roles('admin')
  @Get('question-bank')
  getQuestionBank() {
    return this.surveys.getQuestionBank();
  }

  @Roles('admin')
  @Post()
  createRound(@Body() dto: CreateSurveyRoundDto, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.createRound(dto, user.id);
  }

  @Roles('admin')
  @Get('scores')
  getScores(@Query('roundId') roundId?: string) {
    return this.surveys.getScores(roundId);
  }

  @Roles('admin')
  @Get('scores/by-group')
  getScoresByGroup(@Query('dimension') dimension: string, @Query('roundId') roundId?: string) {
    if (!DEMOGRAPHIC_DIMENSIONS.includes(dimension as DemographicDimension)) {
      throw new BadRequestException('dimension must be "generation" or "staffType".');
    }
    return this.surveys.getScoresByGroup(dimension as DemographicDimension, roundId);
  }

  // Only Employees participate — same scoping as the leaderboard, quests, and kudos.
  @Roles('employee')
  @Get('active')
  findActive(@CurrentUser() user: AuthenticatedUser) {
    return this.surveys.findActiveForViewer(user.id);
  }

  @Roles('employee')
  @Post(':id/responses')
  @HttpCode(HttpStatus.NO_CONTENT)
  submitResponse(
    @Param('id') id: string,
    @Body() dto: SubmitSurveyResponseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.surveys.submitResponse(id, dto, user.id);
  }
}
