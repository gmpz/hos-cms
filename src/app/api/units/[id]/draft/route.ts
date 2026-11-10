import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { discardUnitDraft, UnitInputError } from "@/server/units/repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ยกเลิกฉบับร่าง" }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json(await discardUnitDraft(id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnitInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ error: "คืนฉบับเผยแพร่ไม่ได้ เพราะ URL นี้ถูกใช้เป็นร่างของกลุ่มงานอื่นแล้ว" }, { status: 409 });
    return NextResponse.json({ error: "ยกเลิกฉบับร่างไม่สำเร็จ" }, { status: 500 });
  }
}
