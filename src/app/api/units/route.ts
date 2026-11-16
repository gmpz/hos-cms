import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listUnits, saveUnit, UnitInputError } from "@/server/units/repository";
import { AccessInputError } from "@/server/access/repository";
import { resolveMediaReferences, stripResolvedMedia } from "@/server/media/resolve-references";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const admin = params.get("admin") === "1";
  const trash = params.get("trash") === "1";
  const user = await currentUser();
  if (admin || trash) {
    if (user?.role !== "ADMIN" || user.mustChangePassword)
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดูกลุ่มงานฉบับร่าง" }, { status: 401 });
  }
  return NextResponse.json(await resolveMediaReferences(await listUnits(admin || trash, user, trash)), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการกลุ่มงาน" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body) || !("unit" in body) || !("publish" in body) || typeof body.publish !== "boolean")
      return NextResponse.json({ error: "คำสั่งบันทึกกลุ่มงานไม่ถูกต้อง" }, { status: 400 });
    return NextResponse.json(await resolveMediaReferences(await saveUnit(stripResolvedMedia(body.unit), body.publish)));
  } catch (error) {
    if (error instanceof UnitInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof AccessInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ error: "URL กลุ่มงานซ้ำ" }, { status: 409 });
    return NextResponse.json({ error: "บันทึกกลุ่มงานไม่สำเร็จ" }, { status: 500 });
  }
}
