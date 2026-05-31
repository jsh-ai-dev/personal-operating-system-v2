import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

@Injectable()
export class ForwardedThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Request): Promise<string> {
    const forwardedFor = firstHeaderValue(request.headers["x-forwarded-for"]);
    const realIp = firstHeaderValue(request.headers["x-real-ip"]);
    const clientFingerprint = firstHeaderValue(request.headers["x-client-fingerprint"]);

    return (
      firstForwardedIp(forwardedFor) ??
      realIp ??
      clientFingerprint ??
      request.ip ??
      request.socket.remoteAddress ??
      "unknown"
    );
  }
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function firstForwardedIp(value: string | undefined): string | undefined {
  return value
    ?.split(",")
    .map((part) => part.trim())
    .find(Boolean);
}
