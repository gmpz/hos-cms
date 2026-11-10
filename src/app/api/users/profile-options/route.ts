import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";

export async function GET() {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return Response.json({ error: "ไม่มีสิทธิ์ดูข้อมูลบุคลากร" }, { status: 401 });

  const masters = await prisma.profileMaster.findMany({
    where: { active: true, kind: { in: ["POSITION", "LEVEL"] } },
    select: { kind: true, name: true },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return Response.json({
    positions: masters.filter((item) => item.kind === "POSITION").map((item) => item.name),
    levels: masters.filter((item) => item.kind === "LEVEL").map((item) => item.name),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
