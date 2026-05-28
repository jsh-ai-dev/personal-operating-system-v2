import { Body, Controller, Get, Param, Put } from "@nestjs/common";

import { CurrentUserId } from "../common/decorators/current-user.decorator";
import { ChecklistService } from "./checklist.service";
import { ReplaceChecklistDto } from "./dto/replace-checklist.dto";

@Controller("calendar-checklists")
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get(":dateKey")
  getOne(@CurrentUserId() userId: string, @Param("dateKey") dateKey: string) {
    return this.checklistService.getOne(userId, dateKey);
  }

  @Put(":dateKey")
  replace(
    @CurrentUserId() userId: string,
    @Param("dateKey") dateKey: string,
    @Body() dto: ReplaceChecklistDto,
  ) {
    return this.checklistService.replace(userId, dateKey, dto.items);
  }
}
