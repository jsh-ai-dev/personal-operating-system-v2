import { existsSync } from "node:fs";
import { join } from "node:path";

import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import {
  seconds,
  ThrottlerModule,
  ThrottlerStorageService,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";

import { AuthModule } from "./auth/auth.module";
import { ForwardedThrottlerGuard } from "./auth/forwarded-throttler.guard";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { PrismaModule } from "./prisma/prisma.module";

function resolveEnvFilePath(): string {
  const inCwd = join(process.cwd(), ".env");
  const inParent = join(process.cwd(), "..", ".env");
  const inBackend = join(process.cwd(), "..", "backend", ".env");
  if (existsSync(inCwd)) return inCwd;
  if (existsSync(inBackend)) return inBackend;
  if (existsSync(inParent)) return inParent;
  return inCwd;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePath(),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger("Throttler");
        const redisUrl = config.get<string>("REDIS_URL")?.trim();
        let storage: ThrottlerStorage;

        if (redisUrl) {
          const prefix = config.get<string>("REDIS_KEY_PREFIX")?.trim() || "pos:mk2";
          const redis = new Redis(redisUrl, {
            keyPrefix: `${prefix}:throttle:`,
            maxRetriesPerRequest: 2,
          });
          storage = new ThrottlerStorageRedisService(redis);
          logger.log(`레이트 리밋 저장소: Redis (${redisUrl.replace(/:[^:@/]+@/, ":****@")})`);
        } else {
          storage = new ThrottlerStorageService();
          logger.warn(
            "REDIS_URL이 없어 레이트 리밋이 인메모리로 동작합니다. 프로덕션에서는 REDIS_URL 설정을 권장합니다.",
          );
        }

        const globalLimit = Number(config.get("THROTTLE_GLOBAL_LIMIT") ?? 200);
        const globalTtlSec = Number(config.get("THROTTLE_GLOBAL_TTL_SEC") ?? 60);

        return {
          storage,
          throttlers: [
            {
              name: "default",
              ttl: seconds(globalTtlSec),
              limit: globalLimit,
            },
          ],
        };
      },
    }),
    PrismaModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ForwardedThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
