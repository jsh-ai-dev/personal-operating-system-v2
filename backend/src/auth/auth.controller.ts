import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { minutes, Throttle } from "@nestjs/throttler";
import type { Request } from "express";

import { Public } from "../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type AuthedRequest = Request & { user: { sub: string; email: string } };

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: minutes(60) } })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 12, ttl: minutes(15) } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** JWT가 유효하면 현재 사용자 (BFF·세션 확인용) */
  @Get("me")
  getMe(@Req() req: AuthedRequest) {
    const u = req.user;
    return { user: { id: u.sub, email: u.email } };
  }
}
