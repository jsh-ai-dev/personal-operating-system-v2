import { Logger, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DemoAccountSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoAccountSeeder.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>("DEMO_EMAIL")?.trim().toLowerCase();
    const password = this.config.get<string>("DEMO_PASSWORD");

    if (!email || !password) {
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });

    this.logger.log(`Demo account is ready: ${email}`);
  }
}
