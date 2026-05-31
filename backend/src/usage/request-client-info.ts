import type { Request } from "express";

export function getClientIp(request: Request): string {
  return (
    firstForwardedIp(firstHeaderValue(request.headers["x-forwarded-for"])) ??
    firstHeaderValue(request.headers["x-real-ip"]) ??
    request.ip ??
    request.socket.remoteAddress ??
    "unknown"
  );
}

export function getUserAgent(request: Request): string | undefined {
  return firstHeaderValue(request.headers["user-agent"]);
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
