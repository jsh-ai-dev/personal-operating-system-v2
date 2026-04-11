import { existsSync } from "node:fs";
import { join } from "node:path";

import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import {
  seconds,
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorageService,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";

import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { GoalsModule } from "./goals/goals.module";
import { HealthModule } from "./health/health.module";
import { MemoModule } from "./memo/memo.module";
import { PrismaModule } from "./prisma/prisma.module";

/** 루트에서 `npm run dev:api` 할 때와 `backend`에서 실행할 때 모두 `.env`를 찾습니다. */
function resolveEnvFilePath(): string {
  const inCwd = join(process.cwd(), ".env");
  const inBackend = join(process.cwd(), "backend", ".env");
  if (existsSync(inCwd)) return inCwd;
  if (existsSync(inBackend)) return inBackend;
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
          const prefix = config.get<string>("REDIS_KEY_PREFIX")?.trim() || "pos_v2";
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
    HealthModule,
    MemoModule,
    GoalsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
