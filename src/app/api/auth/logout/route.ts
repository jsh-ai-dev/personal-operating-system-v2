import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { buildAuthProxyHeaders } from "@/lib/server/authProxyHeaders";
import { getAuthServiceUrl } from "@/lib/server/authServiceUrl";

function redirectToRequestHost(request: Request, path: string): NextResponse {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";

  if (host) {
    return NextResponse.redirect(`${proto}://${host}${path}`, { status: 303 });
  }
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const accept = request.headers.get("accept") ?? "";
  const isFormPost = accept.includes("text/html");

  if (token) {
    try {
      await fetch(`${getAuthServiceUrl()}/api/auth/logout`, {
        method: "POST",
        headers: buildAuthProxyHeaders(request, { authorization: `Bearer ${token}` }),
      });
    } catch {
      // Always clear the browser session cookie even if auth-service is unavailable.
    }
  }

  const res = isFormPost
    ? redirectToRequestHost(request, "/login")
    : NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
