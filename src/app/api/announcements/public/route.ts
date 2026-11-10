import { NextResponse } from "next/server";
import { listActivePublicAnnouncements } from "@/server/announcements/repository";

export async function GET() {
  try {
    const announcements = await listActivePublicAnnouncements();
    return NextResponse.json(announcements, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "โหลดประกาศไม่สำเร็จ" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
