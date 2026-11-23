import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listAdminSplashPage } from "@/server/splash-screens/repository";

export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "ไม่มีสิทธิ์ดู Splash Screen" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("size") ?? "10");
  const status = params.get("status") ?? "all";
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || !["all", "published", "draft", "trash"].includes(status))
    return NextResponse.json({ error: "ตัวกรอง Splash Screen ไม่ถูกต้อง" }, { status: 400 });
  return NextResponse.json(await listAdminSplashPage({ page, pageSize, status: status as "all" | "published" | "draft" | "trash" }), { headers: { "Cache-Control": "private, no-store" } });
}
