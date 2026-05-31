import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { buildAuthProxyHeaders } from "@/lib/server/authProxyHeaders";
import { getAuthServiceUrl } from "@/lib/server/authServiceUrl";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function redirectToRequestHost(request: Request, path: string): NextResponse {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";

  if (host) {
    return NextResponse.redirect(`${proto}://${host}${path}`, { status: 303 });
  }
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let body: unknown;
  try {
    if (isFormPost) {
      const formData = await request.formData();
      body = {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      };
    } else {
      body = await request.json();
    }
  } catch {
    if (isFormPost) {
      return redirectToRequestHost(request, "/login?error=invalid-request");
    }
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${getAuthServiceUrl()}/api/auth/login`, {
      method: "POST",
      headers: buildAuthProxyHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
  } catch {
    if (isFormPost) {
      return redirectToRequestHost(request, "/login?error=auth-service");
    }
    return NextResponse.json(
      { message: "인증 서버에 연결할 수 없습니다." },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: { id: string; email: string };
    message?: unknown;
  };

  if (!res.ok) {
    if (isFormPost) {
      return redirectToRequestHost(request, "/login?error=login-failed");
    }
    return NextResponse.json(data, { status: res.status });
  }

  if (!data.accessToken || !data.user) {
    if (isFormPost) {
      return redirectToRequestHost(request, "/login?error=invalid-response");
    }
    return NextResponse.json(
      { message: "인증 서버 응답이 올바르지 않습니다." },
      { status: 502 },
    );
  }

  const out = isFormPost
    ? redirectToRequestHost(request, "/calendar")
    : NextResponse.json({ user: data.user }, { status: 200 });
  out.cookies.set(AUTH_COOKIE_NAME, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return out;
}
