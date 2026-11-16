import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { AnnouncementInputError } from "@/server/announcements/repository";
import { createSplashScreen, listSplashScreens, listDeletedSplashScreens } from "@/server/splash-screens/repository";

async function administrator() { const user = await currentUser(); return user?.role === "ADMIN" && !user.mustChangePassword ? user : null; }

export async function GET(request: Request) {
  if (!await administrator()) return NextResponse.json({ error: "ไม่มีสิทธิ์ดู Splash Screen" }, { status: 401 });
  return NextResponse.json(await (new URL(request.url).searchParams.get("trash") === "1" ? listDeletedSplashScreens() : listSplashScreens()), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Splash Screen" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnnouncementInputError("ข้อมูล Splash Screen ไม่ถูกต้อง");
    const row = body as Record<string, unknown>;
    if (typeof row.publish !== "boolean") throw new AnnouncementInputError("คำสั่งเผยแพร่ไม่ถูกต้อง");
    const result = await createSplashScreen(row.data, user.id, row.publish);
    revalidateTag("announcements", { expire: 0 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AnnouncementInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "มี Splash Screen อื่นเผยแพร่พร้อมกัน กรุณาโหลดใหม่" }, { status: 409 });
    return NextResponse.json({ error: "สร้าง Splash Screen ไม่สำเร็จ" }, { status: 500 });
  }
}
