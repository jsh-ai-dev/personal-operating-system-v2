import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getNotesServiceUrl } from "@/lib/server/notesServiceUrl";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function copyResponseHeaders(from: Headers): Headers {
  const out = new Headers();
  from.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      out.append(key, value);
    }
  });
  return out;
}

async function proxy(request: NextRequest, pathParts: string[]): Promise<NextResponse> {
  if (pathParts[0] !== "v1") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const subPath = pathParts.length ? pathParts.join("/") : "";
  const target = `${getNotesServiceUrl()}/api/${subPath}${request.nextUrl.search}`;

  const headers = new Headers();
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(target, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    });
  } catch {
    return NextResponse.json(
      { message: "노트 API 서버에 연결할 수 없습니다. NOTES_SERVICE_URL과 mk1(Spring) 실행 여부를 확인하세요." },
      { status: 502 },
    );
  }

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: copyResponseHeaders(backendRes.headers),
  });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}
