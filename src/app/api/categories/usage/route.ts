import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { categoryUsageCounts } from "@/server/categories/repository";

export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูจำนวนการใช้งานหมวดหมู่" }, { status: 401 });
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope !== "posts" && scope !== "documents")
    return NextResponse.json({ error: "ประเภทหมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  return NextResponse.json(await categoryUsageCounts(scope), { headers: { "Cache-Control": "private, no-store" } });
}
