import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness() {
    return { status: "ok" as const, service: "personal-operating-system-mk2-api" };
  }

  async getDatabase() {
    await this.prisma.$queryRaw`SELECT 1 AS n`;
    const memoCount = await this.prisma.calendarMemo.count();
    return {
      ok: true,
      calendarMemoCount: memoCount,
    };
  }
}
