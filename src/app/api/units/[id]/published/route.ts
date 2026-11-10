import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { getPublishedUnitSnapshot } from "@/server/units/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูฉบับเผยแพร่" }, { status: 401 });
  const { id } = await params;
  const snapshot = await getPublishedUnitSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: "ไม่พบฉบับเผยแพร่" }, { status: 404 });
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
}
