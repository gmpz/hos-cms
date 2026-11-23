import { InvalidUploadError, validatedUploadBytes } from "@/server/media/validate-upload";
import { randomUUID } from "node:crypto";
import { MediaKind } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { deleteMediaFile, mediaPublicUrl, writeMediaFile } from "@/server/media/storage";

const maxFileSize = 5 * 1024 * 1024;
const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  let savedPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ message: "กรุณาเลือกรูปภาพ" }, { status: 400 });
    if (file.size > maxFileSize) return Response.json({ message: "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB" }, { status: 413 });
    const extension = imageExtensions[file.type];
    if (!extension) return Response.json({ message: "รองรับเฉพาะไฟล์ JPG, PNG และ WebP" }, { status: 415 });

    const assetId = `profile:${user.id}`;
    const bytes = await validatedUploadBytes(file);
    const fileName = `${randomUUID()}.${extension}`;
    const previous = await prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { fileName: true } });
    savedPath = fileName;
    await writeMediaFile(fileName, bytes);
    await prisma.$transaction(async (tx) => {
      await tx.mediaAsset.upsert({
        where: { id: assetId },
        create: { id: assetId, name: `รูปโปรไฟล์ ${user.displayName}`, kind: MediaKind.IMAGE, mimeType: file.type, sizeBytes: file.size, alt: user.displayName, fileName },
        update: { name: `รูปโปรไฟล์ ${user.displayName}`, kind: MediaKind.IMAGE, mimeType: file.type, sizeBytes: file.size, alt: user.displayName, fileName },
      });
      await tx.user.update({ where: { id: user.id }, data: { profileMediaId: assetId, profilePhotoFocusX: 50, profilePhotoFocusY: 25, profilePhotoZoom: 100 } });
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: user.id, action: "user.profile.photo", entityType: "user", entityId: user.id, summary: `เปลี่ยนรูปโปรไฟล์บัญชี ${user.username}` } });
    });
    if (previous?.fileName && previous.fileName !== fileName) await deleteMediaFile(previous.fileName).catch(() => undefined);
    return Response.json({ id: assetId, url: mediaPublicUrl(fileName) });
  } catch (error) {
    if (savedPath) await deleteMediaFile(savedPath).catch(() => undefined);
    if (error instanceof InvalidUploadError) return Response.json({ message: error.message }, { status: 415 });
    return Response.json({ message: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { profileMediaId: null, profilePhotoFocusX: 50, profilePhotoFocusY: 25, profilePhotoZoom: 100 } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: user.id, action: "user.profile.photo.remove", entityType: "user", entityId: user.id, summary: `ลบรูปโปรไฟล์บัญชี ${user.username}` } });
  });
  return Response.json({ success: true });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const value: unknown = await request.json().catch(() => null);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return Response.json({ message: "ตำแหน่งรูปไม่ถูกต้อง" }, { status: 400 });
  const { x, y, zoom } = value as Record<string, unknown>;
  if (!Number.isInteger(x) || !Number.isInteger(y) || typeof x !== "number" || typeof y !== "number" || x < 0 || x > 100 || y < 0 || y > 100)
    return Response.json({ message: "ตำแหน่งรูปต้องอยู่ระหว่าง 0–100" }, { status: 400 });
  if (!Number.isInteger(zoom) || typeof zoom !== "number" || zoom < 100 || zoom > 300)
    return Response.json({ message: "ระดับการซูมต้องอยู่ระหว่าง 100–300" }, { status: 400 });
  const updated = await prisma.user.updateMany({ where: { id: user.id, profileMediaId: { not: null } }, data: { profilePhotoFocusX: x, profilePhotoFocusY: y, profilePhotoZoom: zoom } });
  if (!updated.count) return Response.json({ message: "กรุณาเพิ่มรูปโปรไฟล์ก่อน" }, { status: 400 });
  await prisma.auditLog.create({ data: { id: randomUUID(), actorId: user.id, action: "user.profile.photo.focus", entityType: "user", entityId: user.id, summary: `จัดตำแหน่งรูปโปรไฟล์บัญชี ${user.username}` } });
  return Response.json({ success: true });
}
