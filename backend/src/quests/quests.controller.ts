import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { attachmentFileOptions } from '../submissions/multer.config';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('quests')
export class QuestsController {
  constructor(private quests: QuestsService) {}

  // Every role can read — scoped per role inside the service (Employee sees
  // their visible catalog, Manager their own department, Admin everything).
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.quests.findAllForViewer(user);
  }

  @Roles('manager', 'admin')
  @Post()
  create(@Body() dto: CreateQuestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.quests.create(dto, user);
  }

  @Roles('manager', 'admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.quests.update(id, dto, user);
  }

  @Roles('manager', 'admin')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quests.remove(id, user);
  }

  @Roles('manager', 'admin')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentFileOptions))
  addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quests.addAttachment(id, file, user);
  }

  @Roles('manager', 'admin')
  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quests.removeAttachment(id, attachmentId, user);
  }

  // Every role may download, but only for quests visible to them (checked in the service).
  @Get(':id/attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const attachment = await this.quests.findDownloadableAttachment(id, attachmentId, user);
    res.download(attachment.filePath, attachment.fileName);
  }
}
