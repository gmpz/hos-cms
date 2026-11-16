import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { currentUser } from "@/server/auth/session";
import { AnnouncementInputError, actOnAnnouncement, updateAnnouncement } from "@/server/announcements/repository";
import { actOnDeletedAnnouncement } from "@/server/announcements/trash";

async function administrator() {
  const user = await currentUser();
  return user?.role === "ADMIN" && !user.mustChangePassword ? user : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการประกาศ" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnnouncementInputError("ข้อมูลประกาศไม่ถูกต้อง");
    const row = body as Record<string, unknown>;
    if (typeof row.publish !== "boolean") throw new AnnouncementInputError("คำสั่งเผยแพร่ไม่ถูกต้อง");
    const result = await updateAnnouncement((await params).id, row.data, row.revision, user.id, row.publish);
    revalidateTag("announcements", { expire: 0 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnnouncementInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "บันทึกประกาศไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการประกาศ" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnnouncementInputError("คำสั่งไม่ถูกต้อง");
    const row = body as Record<string, unknown>;
    if (row.action !== "publish" && row.action !== "unpublish" && row.action !== "delete" && row.action !== "discard-draft" && row.action !== "restore" && row.action !== "purge") throw new AnnouncementInputError("คำสั่งไม่ถูกต้อง");
    const id = (await params).id;
    const result = row.action === "restore" || row.action === "purge"
      ? await actOnDeletedAnnouncement(id, "MODAL", row.action, row.revision, user.id)
      : await actOnAnnouncement(id, row.action, row.revision, user.id);
    revalidateTag("announcements", { expire: 0 });
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof AnnouncementInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "จัดการประกาศไม่สำเร็จ" }, { status: 500 });
  }
}
