import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { getUnitChangeSummary } from "@/server/units/change-summary";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูรายการเปลี่ยนแปลง" }, { status: 401 });
  const { id } = await params;
  const changes = await getUnitChangeSummary(id);
  if (!changes) return NextResponse.json({ error: "ไม่พบฉบับเผยแพร่" }, { status: 404 });
  return NextResponse.json(changes, { headers: { "Cache-Control": "private, no-store" } });
}
