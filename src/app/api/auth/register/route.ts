import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { buildAuthProxyHeaders } from "@/lib/server/authProxyHeaders";
import { getAuthServiceUrl } from "@/lib/server/authServiceUrl";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${getAuthServiceUrl()}/api/auth/register`, {
      method: "POST",
      headers: buildAuthProxyHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { message: "인증 서버에 연결할 수 없습니다." },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: { id: string; email: string };
  };

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (!data.accessToken || !data.user) {
    return NextResponse.json(
      { message: "인증 서버 응답이 올바르지 않습니다." },
      { status: 502 },
    );
  }

  const out = NextResponse.json({ user: data.user }, { status: 201 });
  out.cookies.set(AUTH_COOKIE_NAME, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return out;
}
