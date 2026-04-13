import {
  Injectable,
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export type JwtRevocationPayload = {
  sub: string;
  jti?: string;
  sv?: number;
  exp?: number;
};

@Injectable()
export class JwtRevocationService implements OnModuleDestroy {
  private readonly logger = new Logger(JwtRevocationService.name);
  private readonly redis: Redis | null;
  /** jti → 만료 시각(ms) — REDIS_URL 없을 때만 사용 */
  private readonly memoryDeny = new Map<string, number>();
  /** userId → 세션 버전 — REDIS_URL 없을 때만 사용 */
  private readonly memorySv = new Map<string, number>();

  constructor(private readonly config: ConfigService) {
    const redisUrl = config.get<string>("REDIS_URL")?.trim();
    const prefix = config.get<string>("REDIS_KEY_PREFIX")?.trim() || "pos_mk2";

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        keyPrefix: `${prefix}:`,
        maxRetriesPerRequest: 2,
      });
      this.logger.log(
        `JWT 블랙리스트·세션 버전: Redis (${redisUrl.replace(/:[^:@/]+@/, ":****@")})`,
      );
    } else {
      this.redis = null;
      this.logger.warn(
        "REDIS_URL이 없어 JWT 블랙리스트·세션 버전이 인메모리로 동작합니다. 재시작 시 세션 버전이 초기화됩니다.",
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async getSessionVersion(userId: string): Promise<number> {
    if (this.redis) {
      const raw = await this.redis.get(`user:sv:${userId}`);
      return raw ? parseInt(raw, 10) : 0;
    }
    return this.memorySv.get(userId) ?? 0;
  }

  /** 모든 기기 로그아웃 — 새로 발급되는 토큰만 유효 */
  async incrementSessionVersion(userId: string): Promise<void> {
    if (this.redis) {
      await this.redis.incr(`user:sv:${userId}`);
    } else {
      this.memorySv.set(userId, (this.memorySv.get(userId) ?? 0) + 1);
    }
  }

  /**
   * 단일 토큰 무효화 — 로그아웃 시 JWT 만료 시각까지 Redis에 보관
   */
  async denyJti(jti: string, expiresAtSec: number): Promise<void> {
    const ttlSec = Math.ceil(expiresAtSec - Date.now() / 1000);
    if (ttlSec <= 0) return;

    if (this.redis) {
      await this.redis.set(`jwt:deny:${jti}`, "1", "EX", ttlSec);
    } else {
      this.memoryDeny.set(jti, expiresAtSec * 1000);
    }
  }

  private async isJtiDenied(jti: string): Promise<boolean> {
    if (this.redis) {
      const v = await this.redis.get(`jwt:deny:${jti}`);
      return v === "1";
    }
    const untilMs = this.memoryDeny.get(jti);
    if (untilMs === undefined) return false;
    if (Date.now() >= untilMs) {
      this.memoryDeny.delete(jti);
      return false;
    }
    return true;
  }

  async assertTokenAllowed(payload: JwtRevocationPayload): Promise<void> {
    const sv = payload.sv ?? 0;
    const current = await this.getSessionVersion(payload.sub);
    if (sv !== current) {
      throw new UnauthorizedException();
    }
    if (payload.jti && (await this.isJtiDenied(payload.jti))) {
      throw new UnauthorizedException();
    }
  }
}
