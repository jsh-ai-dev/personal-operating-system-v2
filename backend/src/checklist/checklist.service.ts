import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ReplaceChecklistItemDto } from "./dto/replace-checklist.dto";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KOREA_TIME_ZONE = "Asia/Seoul";

type ChecklistItemResponse = {
  id: string;
  title: string;
  isChecked: boolean;
};

type ChecklistResponse = {
  dateKey: string;
  todayKey: string;
  editable: boolean;
  isFuture: boolean;
  startedOn: string | null;
  items: ChecklistItemResponse[];
};

type TemplateWithItems = Prisma.CalendarChecklistTemplateVersionGetPayload<{
  include: { items: true };
}>;

type DayWithItems = Prisma.CalendarChecklistDayGetPayload<{
  include: { items: true };
}>;

function getKoreaTodayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function assertDateKey(dateKey: string): void {
  if (!DATE_KEY_RE.test(dateKey)) {
    throw new BadRequestException("dateKey must be YYYY-MM-DD");
  }
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeItems(items: ReplaceChecklistItemDto[]) {
  return items
    .map((item, index) => ({
      title: item.title.trim(),
      isChecked: item.isChecked ?? false,
      sortOrder: index,
    }))
    .filter((item) => item.title.length > 0);
}

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(userId: string, dateKey: string): Promise<ChecklistResponse> {
    assertDateKey(dateKey);
    const todayKey = getKoreaTodayKey();
    await this.materializeDueDays(userId, todayKey);

    const profile = await this.prisma.calendarChecklistProfile.findUnique({
      where: { userId },
    });

    if (dateKey > todayKey) {
      const template = await this.findTemplateForDate(userId, todayKey);
      return {
        dateKey,
        todayKey,
        editable: false,
        isFuture: true,
        startedOn: profile?.startedOn ?? null,
        items:
          template?.items
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              id: item.id,
              title: item.title,
              isChecked: false,
            })) ?? [],
      };
    }

    const day = await this.findDay(userId, dateKey);
    return {
      dateKey,
      todayKey,
      editable: true,
      isFuture: false,
      startedOn: profile?.startedOn ?? null,
      items: day ? this.dayItemsToResponse(day) : [],
    };
  }

  async replace(
    userId: string,
    dateKey: string,
    items: ReplaceChecklistItemDto[],
  ): Promise<ChecklistResponse> {
    assertDateKey(dateKey);
    const todayKey = getKoreaTodayKey();
    if (dateKey > todayKey) {
      throw new ForbiddenException("Future checklists are read-only");
    }

    const normalized = normalizeItems(items);
    await this.materializeDueDays(userId, todayKey);

    if (dateKey === todayKey) {
      await this.prisma.$transaction(async (tx) => {
        if (normalized.length > 0) {
          await tx.calendarChecklistProfile.upsert({
            where: { userId },
            create: { userId, startedOn: todayKey },
            update: {},
          });
        }
        await this.replaceDayInTransaction(tx, userId, dateKey, normalized, null);
        await this.replaceTemplateInTransaction(tx, userId, todayKey, normalized);
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await this.replaceDayInTransaction(tx, userId, dateKey, normalized, null);
      });
    }

    return this.getOne(userId, dateKey);
  }

  private async materializeDueDays(userId: string, todayKey: string): Promise<void> {
    const profile = await this.prisma.calendarChecklistProfile.findUnique({
      where: { userId },
    });
    if (!profile) return;

    let cursor = profile.startedOn;
    while (cursor <= todayKey) {
      const existing = await this.prisma.calendarChecklistDay.findUnique({
        where: { userId_dateKey: { userId, dateKey: cursor } },
        select: { id: true },
      });
      if (!existing) {
        const template = await this.findTemplateForDate(userId, cursor);
        if (template) {
          await this.createDayFromTemplate(userId, cursor, template);
        }
      }
      cursor = addDays(cursor, 1);
    }
  }

  private async findTemplateForDate(
    userId: string,
    dateKey: string,
  ): Promise<TemplateWithItems | null> {
    return this.prisma.calendarChecklistTemplateVersion.findFirst({
      where: { userId, effectiveFrom: { lte: dateKey } },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  private async findDay(
    userId: string,
    dateKey: string,
  ): Promise<DayWithItems | null> {
    return this.prisma.calendarChecklistDay.findUnique({
      where: { userId_dateKey: { userId, dateKey } },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  }

  private async createDayFromTemplate(
    userId: string,
    dateKey: string,
    template: TemplateWithItems,
  ): Promise<void> {
    await this.prisma.calendarChecklistDay.create({
      data: {
        userId,
        dateKey,
        sourceVersionId: template.id,
        items: {
          create: template.items.map((item) => ({
            sourceTemplateItemId: item.id,
            title: item.title,
            isChecked: false,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });
  }

  private async replaceDayInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    dateKey: string,
    items: ReturnType<typeof normalizeItems>,
    sourceVersionId: string | null,
  ): Promise<void> {
    const day = await tx.calendarChecklistDay.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      create: { userId, dateKey, sourceVersionId },
      update: { sourceVersionId },
    });
    await tx.calendarChecklistDayItem.deleteMany({ where: { dayId: day.id } });
    if (items.length === 0) return;
    await tx.calendarChecklistDayItem.createMany({
      data: items.map((item) => ({
        dayId: day.id,
        title: item.title,
        isChecked: item.isChecked,
        sortOrder: item.sortOrder,
      })),
    });
  }

  private async replaceTemplateInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    effectiveFrom: string,
    items: ReturnType<typeof normalizeItems>,
  ): Promise<void> {
    const version = await tx.calendarChecklistTemplateVersion.upsert({
      where: { userId_effectiveFrom: { userId, effectiveFrom } },
      create: { userId, effectiveFrom },
      update: {},
    });
    await tx.calendarChecklistTemplateItem.deleteMany({
      where: { versionId: version.id },
    });
    if (items.length === 0) return;
    await tx.calendarChecklistTemplateItem.createMany({
      data: items.map((item) => ({
        versionId: version.id,
        title: item.title,
        sortOrder: item.sortOrder,
      })),
    });
  }

  private dayItemsToResponse(day: DayWithItems): ChecklistItemResponse[] {
    return day.items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        title: item.title,
        isChecked: item.isChecked,
      }));
  }
}
