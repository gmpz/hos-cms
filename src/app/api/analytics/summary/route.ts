import { NextResponse } from "next/server";
import { totalSiteVisits } from "@/server/analytics/site-visits";

export async function GET() {
  try {
    return NextResponse.json(await totalSiteVisits(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดสถิติได้" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
