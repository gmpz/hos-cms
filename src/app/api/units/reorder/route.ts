import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { reorderUnits, UnitInputError } from "@/server/units/repository";

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดลำดับหน่วยงาน" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || !("ids" in body) || !Array.isArray(body.ids) || !body.ids.every((id): id is string => typeof id === "string"))
      throw new UnitInputError("คำสั่งจัดลำดับหน่วยงานไม่ถูกต้อง");
    await reorderUnits(body.ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnitInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "จัดลำดับหน่วยงานไม่สำเร็จ" }, { status: 500 });
  }
}
