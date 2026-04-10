import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CalendarMemo, Prisma } from "@prisma/client";

import { PatchMemoDto } from "./dto/patch-memo.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MemoService {
  constructor(private readonly prisma: PrismaService) {}

  async findByRange(from: string, to: string): Promise<CalendarMemo[]> {
    if (from > to) {
      throw new BadRequestException("`from` must be <= `to`");
    }
    return this.prisma.calendarMemo.findMany({
      where: { dateKey: { gte: from, lte: to } },
      orderBy: { dateKey: "asc" },
    });
  }

  async findOne(dateKey: string): Promise<CalendarMemo> {
    const memo = await this.prisma.calendarMemo.findUnique({
      where: { dateKey },
    });
    if (!memo) {
      throw new NotFoundException(`Memo not found for ${dateKey}`);
    }
    return memo;
  }

  async upsert(dateKey: string, brief: string, detail: string): Promise<CalendarMemo> {
    return this.prisma.calendarMemo.upsert({
      where: { dateKey },
      create: { dateKey, brief, detail },
      update: { brief, detail },
    });
  }

  async createFromBody(dateKey: string, brief?: string, detail?: string): Promise<CalendarMemo> {
    return this.upsert(dateKey, brief ?? "", detail ?? "");
  }

  async replace(dateKey: string, brief?: string, detail?: string): Promise<CalendarMemo> {
    return this.upsert(dateKey, brief ?? "", detail ?? "");
  }

  async patch(dateKey: string, dto: PatchMemoDto): Promise<CalendarMemo> {
    const data: Prisma.CalendarMemoUpdateInput = {};
    if (dto.brief !== undefined) data.brief = dto.brief;
    if (dto.detail !== undefined) data.detail = dto.detail;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException("brief 또는 detail 중 하나는 필요합니다.");
    }
    try {
      return await this.prisma.calendarMemo.update({
        where: { dateKey },
        data,
      });
    } catch {
      throw new NotFoundException(`Memo not found for ${dateKey}`);
    }
  }

  async remove(dateKey: string): Promise<void> {
    try {
      await this.prisma.calendarMemo.delete({ where: { dateKey } });
    } catch {
      throw new NotFoundException(`Memo not found for ${dateKey}`);
    }
  }
}
