import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPageView(input: {
    userId: string;
    path: string;
    ipAddress: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.pageView.create({
      data: {
        userId: input.userId,
        path: input.path,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
