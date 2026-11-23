import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listPublicPersonnel } from "@/server/units/repository";
import { resolveMediaReferences } from "@/server/media/resolve-references";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const unitId = params.get("unit") || null;
  const limit = Number(params.get("limit") ?? "8");
  if ((unitId && !/^[a-zA-Z0-9_-]{1,100}$/.test(unitId)) || !Number.isInteger(limit) || limit < 1 || limit > 24)
    return NextResponse.json({ error: "ตัวกรองบุคลากรไม่ถูกต้อง" }, { status: 400 });
  const people = await listPublicPersonnel({ unitId, limit }, await currentUser());
  return NextResponse.json(await resolveMediaReferences(people), { headers: { "Cache-Control": "private, no-store" } });
}
