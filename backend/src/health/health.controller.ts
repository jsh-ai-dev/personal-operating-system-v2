import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";
import { HealthService } from "./health.service";

@Controller("health")
@Public()
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  liveness() {
    return this.health.getLiveness();
  }

  /** DB 연결 및 간단 쿼리 확인 (테이블 없으면 마이그레이션 필요) */
  @Get("db")
  async database() {
    return this.health.getDatabase();
  }
}
