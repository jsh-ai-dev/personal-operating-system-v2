export function buildAuthProxyHeaders(
  request: Request,
  headers: Record<string, string> = {},
): Record<string, string> {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const userAgent = request.headers.get("user-agent");

  return {
    ...headers,
    ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    ...(realIp ? { "x-real-ip": realIp } : {}),
    ...(forwardedHost ? { "x-forwarded-host": forwardedHost } : {}),
    ...(forwardedProto ? { "x-forwarded-proto": forwardedProto } : {}),
    ...(userAgent ? { "user-agent": userAgent } : {}),
    ...(userAgent ? { "x-client-fingerprint": userAgent } : {}),
  };
}
