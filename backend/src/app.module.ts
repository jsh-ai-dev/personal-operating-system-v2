import { existsSync } from "node:fs";
import { join } from "node:path";

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

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
    PrismaModule,
    HealthModule,
    MemoModule,
  ],
})
export class AppModule {}
