import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getAuthServiceUrl } from "@/lib/server/authServiceUrl";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function POST() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ message: "Demo login is not configured." }, { status: 503 });
  }

  let res: Response;
  try {
    res = await fetch(`${getAuthServiceUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ message: "인증 서버에 연결할 수 없습니다." }, { status: 502 });
  }

  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: { id: string; email: string };
    message?: unknown;
  };

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (!data.accessToken || !data.user) {
    return NextResponse.json({ message: "인증 서버 응답이 올바르지 않습니다." }, { status: 502 });
  }

  const out = NextResponse.json({ user: data.user }, { status: 200 });
  out.cookies.set(AUTH_COOKIE_NAME, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return out;
}
