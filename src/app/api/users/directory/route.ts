import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";

export async function GET() {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return Response.json({ error: "ไม่มีสิทธิ์ดูข้อมูลบุคลากร" }, { status: 401 });
  const rows = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true, displayName: true, phone: true, phoneExtension: true, email: true, profileMediaId: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true,
      position: { select: { name: true } },
      memberships: { select: { unitId: true, isPrimary: true, unit: { select: { name: true } } }, orderBy: { isPrimary: "desc" } },
    },
    orderBy: { displayName: "asc" },
  });
  return Response.json(rows.map((row) => ({
    id: row.id,
    name: row.displayName,
    position: row.position?.name ?? "",
    phone: row.phone,
    phoneExtension: row.phoneExtension,
    email: row.email,
    mediaId: row.profileMediaId,
    photoFocus: { x: row.profilePhotoFocusX, y: row.profilePhotoFocusY, zoom: row.profilePhotoZoom },
    unitIds: row.memberships.map((membership) => membership.unitId),
    units: row.memberships.map((membership) => membership.unit.name),
  })), { headers: { "Cache-Control": "private, no-store" } });
}
