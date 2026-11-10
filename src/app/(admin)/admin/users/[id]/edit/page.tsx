import { notFound } from "next/navigation";
import { AdminUserEditor } from "@/features/users/components/admin-user-editor";
import { currentUser } from "@/server/auth/session";
import { getUserProfileOptions } from "@/server/auth/users";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

export const instant = false;

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, options, actor] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: {
      id: true, username: true, displayName: true, role: true, status: true, phone: true, phoneExtension: true, email: true, publishPhone: true, publishEmail: true,
      personTypeId: true, positionId: true, levelId: true, profileMediaId: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true,
      profileMedia: { select: { fileName: true } }, personType: { select: { name: true } }, position: { select: { name: true } }, level: { select: { name: true } },
      memberships: { select: { unitId: true, isPrimary: true, unit: { select: { name: true } } }, orderBy: { isPrimary: "desc" } },
    } }),
    getUserProfileOptions(),
    currentUser(),
  ]);
  if (!user) notFound();
  const editorKey = JSON.stringify([
    user.displayName, user.role, user.status, user.phone, user.phoneExtension, user.email,
    user.publishPhone, user.publishEmail, user.personTypeId, user.positionId, user.levelId,
    user.profileMedia?.fileName, user.profilePhotoFocusX, user.profilePhotoFocusY, user.profilePhotoZoom,
    user.memberships.map((item) => [item.unitId, item.isPrimary]),
  ]);
  return <AdminUserEditor key={editorKey} user={{ ...user, unitIds: user.memberships.map((item) => item.unitId), primaryUnitId: user.memberships.find((item) => item.isPrimary)?.unitId ?? null, photoUrl: user.profileMedia ? mediaPublicUrl(user.profileMedia.fileName) : null }} options={options} currentUserId={actor?.id ?? ""}/>;
}
