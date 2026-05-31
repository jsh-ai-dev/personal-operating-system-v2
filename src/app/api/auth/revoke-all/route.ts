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

/** Nest `POST /api/auth/sessions/revoke-all` — all-device session invalidation. */
export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const accept = request.headers.get("accept") ?? "";
  const isFormPost = accept.includes("text/html");

  if (!token) {
    if (isFormPost) return redirectToRequestHost(request, "/login");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${getAuthServiceUrl()}/api/auth/sessions/revoke-all`, {
      method: "POST",
      headers: buildAuthProxyHeaders(request, { authorization: `Bearer ${token}` }),
    });
  } catch {
    if (isFormPost) return redirectToRequestHost(request, "/login?error=auth-service");
    return NextResponse.json({ message: "API 서버에 연결할 수 없습니다." }, { status: 502 });
  }

  if (!backendRes.ok) {
    if (isFormPost) return redirectToRequestHost(request, "/login?error=revoke-all-failed");

    const text = await backendRes.text();
    return new NextResponse(text || null, {
      status: backendRes.status,
      headers: { "content-type": backendRes.headers.get("content-type") ?? "application/json" },
    });
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
