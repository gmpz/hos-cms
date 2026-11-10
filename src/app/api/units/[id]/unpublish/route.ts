import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { unpublishUnit, UnitInputError } from "@/server/units/repository";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ยกเลิกการเผยแพร่กลุ่มงาน" }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json(await unpublishUnit(id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnitInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "ยกเลิกการเผยแพร่ไม่สำเร็จ" }, { status: 500 });
  }
}
