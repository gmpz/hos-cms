import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { restoreUnit, UnitInputError } from "@/server/units/repository";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์กู้คืนกลุ่มงาน" }, { status: 401 });
  try {
    const { id } = await params;
    await restoreUnit(id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnitInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "กู้คืนกลุ่มงานไม่สำเร็จ" }, { status: 500 });
  }
}
