import { Controller, Get } from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private skills: SkillsService) {}

  // Every role can view the catalog, same openness as Badges.
  @Get()
  findAll() {
    return this.skills.findAll();
  }
}
