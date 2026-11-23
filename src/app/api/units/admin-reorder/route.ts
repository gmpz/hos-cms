import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { moveAdminUnit, UnitInputError } from "@/server/units/repository";

export async function POST(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดลำดับหน่วยงาน" }, { status: 401 });
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { id, direction } = body as Record<string, unknown>;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || (direction !== "up" && direction !== "down"))
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  try {
    await moveAdminUnit(id, direction);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnitInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "จัดลำดับหน่วยงานไม่สำเร็จ" }, { status: 500 });
  }
}
