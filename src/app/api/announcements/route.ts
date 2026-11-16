import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { currentUser } from "@/server/auth/session";
import { AnnouncementInputError, createAnnouncement, listAnnouncements, listDeletedAnnouncements } from "@/server/announcements/repository";

async function administrator() {
  const user = await currentUser();
  return user?.role === "ADMIN" && !user.mustChangePassword ? user : null;
}

export async function GET(request: Request) {
  if (!await administrator()) return NextResponse.json({ error: "ไม่มีสิทธิ์ดูประกาศ" }, { status: 401 });
  return NextResponse.json(await (new URL(request.url).searchParams.get("trash") === "1" ? listDeletedAnnouncements() : listAnnouncements()), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการประกาศ" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnnouncementInputError("ข้อมูลประกาศไม่ถูกต้อง");
    const row = body as Record<string, unknown>;
    if (typeof row.publish !== "boolean") throw new AnnouncementInputError("คำสั่งเผยแพร่ไม่ถูกต้อง");
    const result = await createAnnouncement(row.data, user.id, row.publish);
    revalidateTag("announcements", { expire: 0 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AnnouncementInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "สร้างประกาศไม่สำเร็จ" }, { status: 500 });
  }
}
