import { randomUUID } from "node:crypto";

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { JwtUser } from "./jwt.strategy";
import { JwtRevocationService } from "./jwt-revocation.service";

const RESERVED_EMAIL_LOCAL_PARTS = [
  "admin",
  "administrator",
  "root",
  "system",
  "superuser",
  "owner",
] as const;

function isReservedEmail(email: string): boolean {
  const [localPart] = email.split("@");

  return RESERVED_EMAIL_LOCAL_PARTS.some(
    (reserved) =>
      localPart === reserved ||
      localPart.startsWith(`${reserved}.`) ||
      localPart.startsWith(`${reserved}-`) ||
      localPart.startsWith(`${reserved}_`),
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly revocation: JwtRevocationService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (isReservedEmail(email)) {
      throw new ConflictException("사용할 수 없는 이메일입니다.");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException("이미 가입된 이메일입니다.");
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });
    return await this.buildAuthResponse(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    return await this.buildAuthResponse(user.id, user.email);
  }

  private async buildAuthResponse(userId: string, email: string) {
    const jti = randomUUID();
    const sv = await this.revocation.getSessionVersion(userId);
    const accessToken = this.jwt.sign({ sub: userId, email, jti, sv });
    return {
      accessToken,
      user: { id: userId, email },
    };
  }

  /** 현재 토큰만 블랙리스트 (로그아웃) */
  async logout(user: JwtUser): Promise<void> {
    if (user.jti !== undefined && user.exp !== undefined) {
      await this.revocation.denyJti(user.jti, user.exp);
    }
  }

  /** 해당 사용자의 모든 JWT 무효화 (다른 기기 포함) */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.revocation.incrementSessionVersion(userId);
  }
}
