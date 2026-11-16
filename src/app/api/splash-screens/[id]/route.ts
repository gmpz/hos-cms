import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { AnnouncementInputError } from "@/server/announcements/repository";
import { actOnSplashScreen, updateSplashScreen } from "@/server/splash-screens/repository";
import { actOnDeletedAnnouncement } from "@/server/announcements/trash";

async function administrator() { const user = await currentUser(); return user?.role === "ADMIN" && !user.mustChangePassword ? user : null; }

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Splash Screen" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnnouncementInputError("ข้อมูล Splash Screen ไม่ถูกต้อง");
    const row = body as Record<string, unknown>;
    if (typeof row.publish !== "boolean") throw new AnnouncementInputError("คำสั่งเผยแพร่ไม่ถูกต้อง");
    const result = await updateSplashScreen((await params).id, row.data, row.revision, user.id, row.publish);
    revalidateTag("announcements", { expire: 0 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnnouncementInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "มี Splash Screen อื่นเผยแพร่พร้อมกัน กรุณาโหลดใหม่" }, { status: 409 });
    return NextResponse.json({ error: "บันทึก Splash Screen ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Splash Screen" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnnouncementInputError("คำสั่งไม่ถูกต้อง");
    const row = body as Record<string, unknown>;
    if (row.action !== "publish" && row.action !== "unpublish" && row.action !== "delete" && row.action !== "discard-draft" && row.action !== "restore" && row.action !== "purge") throw new AnnouncementInputError("คำสั่งไม่ถูกต้อง");
    const id = (await params).id;
    const result = row.action === "restore" || row.action === "purge"
      ? await actOnDeletedAnnouncement(id, "SPLASH", row.action, row.revision, user.id)
      : await actOnSplashScreen(id, row.action, row.revision, user.id);
    revalidateTag("announcements", { expire: 0 });
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof AnnouncementInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "มี Splash Screen อื่นเผยแพร่พร้อมกัน กรุณาโหลดใหม่" }, { status: 409 });
    return NextResponse.json({ error: "จัดการ Splash Screen ไม่สำเร็จ" }, { status: 500 });
  }
}
