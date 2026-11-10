import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { deleteUnit, UnitInputError } from "@/server/units/repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบกลุ่มงาน" }, { status: 401 });
  try {
    const { id } = await params;
    await deleteUnit(id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnitInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      return NextResponse.json({ error: "ลบกลุ่มงานไม่ได้ เนื่องจากยังมีข้อมูลอื่นเชื่อมโยงอยู่" }, { status: 409 });
    return NextResponse.json({ error: "ลบกลุ่มงานไม่สำเร็จ" }, { status: 500 });
  }
}
