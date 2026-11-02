import { Body, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SubmissionsService } from './submissions.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { submissionFileOptions } from './multer.config';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('submissions')
export class SubmissionsController {
  constructor(private submissions: SubmissionsService) {}

  @Roles('employee')
  @Post()
  @UseInterceptors(FileInterceptor('file', submissionFileOptions))
  submit(
    @Body() dto: SubmitAssignmentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.submissions.submit(dto, file, user);
  }

  // No @Roles() here on purpose — all three roles may be allowed, but only
  // for a *specific* submission (owner, their manager, or Admin); that's a
  // per-resource check the service makes, not a blanket per-role one.
  @Get(':id/file')
  async downloadFile(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const submission = await this.submissions.findDownloadable(id, user);
    res.download(submission.filePath as string, submission.fileName ?? 'submission');
  }
}
