import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { CurrentUserId } from "../common/decorators/current-user.decorator";
import { RecordPageViewDto } from "./dto/record-page-view.dto";
import { getClientIp, getUserAgent } from "./request-client-info";
import { UsageService } from "./usage.service";

@Controller("usage")
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post("page-view")
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordPageView(
    @CurrentUserId() userId: string,
    @Body() dto: RecordPageViewDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.usageService.recordPageView({
      userId,
      path: dto.path,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  }
}
