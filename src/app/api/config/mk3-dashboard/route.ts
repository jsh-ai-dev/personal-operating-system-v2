import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    scraperRefreshEnabled: process.env.MK3_SCRAPER_REFRESH_ENABLED !== "false",
  });
}
