import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { currentUser } from "@/server/auth/session";
import { getSiteSettings, SiteSettingsInputError, updateSiteSettings } from "@/server/site-settings/repository";
import { resolveMediaReferences, stripResolvedMedia } from "@/server/media/resolve-references";

export async function GET() {
  try { return NextResponse.json(await resolveMediaReferences(await getSiteSettings()), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "โหลดการตั้งค่าเว็บไซต์ไม่สำเร็จ" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขการตั้งค่าเว็บไซต์" }, { status: 401 });
  try {
    const settings = await updateSiteSettings(stripResolvedMedia(await request.json()), user.id);
    revalidateTag("site-settings", { expire: 0 });
    return NextResponse.json(await resolveMediaReferences(settings), { headers: { "Cache-Control": "no-store" } });
  }
  catch (error) {
    if (error instanceof SiteSettingsInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "บันทึกการตั้งค่าเว็บไซต์ไม่สำเร็จ" }, { status: 500 });
  }
}
