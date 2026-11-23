"use server";

import { InvalidUploadError, validatedUploadBytes } from "@/server/media/validate-upload";

import { randomUUID } from "node:crypto";
import { MediaKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { deleteMediaFile, writeMediaFile } from "@/server/media/storage";
import { isValidPhone, isValidPhoneExtension, phoneDigits } from "./phone";

const maxPhotoSize = 5 * 1024 * 1024;
const photoExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function updateOwnProfileAction(formData: FormData) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) redirect("/login?returnTo=%2Fprofile");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = phoneDigits(String(formData.get("phone") ?? ""));
  const phoneExtension = phoneDigits(String(formData.get("phoneExtension") ?? ""), 6);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const personTypeId = String(formData.get("personTypeId") ?? "").trim() || null;
  const positionId = String(formData.get("positionId") ?? "").trim() || null;
  const levelId = String(formData.get("levelId") ?? "").trim() || null;
  const profilePhotoFocusX = Number(formData.get("profilePhotoFocusX"));
  const profilePhotoFocusY = Number(formData.get("profilePhotoFocusY"));
  const profilePhotoZoom = Number(formData.get("profilePhotoZoom"));
  const profilePhotoAction = String(formData.get("profilePhotoAction") ?? "keep");
  const profilePhoto = formData.get("profilePhoto");
  if (displayName.length < 2 || displayName.length > 160) redirect("/profile?error=name");
  if (!isValidPhone(phone) || !isValidPhoneExtension(phoneExtension) || (phoneExtension && !phone) || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) redirect("/profile?error=invalid");
  if (!Number.isInteger(profilePhotoFocusX) || profilePhotoFocusX < 0 || profilePhotoFocusX > 100 || !Number.isInteger(profilePhotoFocusY) || profilePhotoFocusY < 0 || profilePhotoFocusY > 100 || !Number.isInteger(profilePhotoZoom) || profilePhotoZoom < 100 || profilePhotoZoom > 300) redirect("/profile?error=invalid");
  if (!["keep", "replace", "remove"].includes(profilePhotoAction)) redirect("/profile?error=photo");
  const replacingPhoto = profilePhotoAction === "replace";
  if (replacingPhoto && (!(profilePhoto instanceof File) || profilePhoto.size === 0 || profilePhoto.size > maxPhotoSize || !photoExtensions[profilePhoto.type])) redirect("/profile?error=photo");
  const selections = [{ id: personTypeId, kind: "PERSON_TYPE" as const }, { id: positionId, kind: "POSITION" as const }, { id: levelId, kind: "LEVEL" as const }];
  const validity = await Promise.all(selections.map(({ id, kind }) => id ? prisma.profileMaster.count({ where: { id, kind, active: true } }) : Promise.resolve(1)));
  if (validity.some((count) => count !== 1)) redirect("/profile?error=profile");
  const assetId = `profile:${user.id}`;
  const currentAsset = await prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { fileName: true } });
  let newFileName: string | null = null;
  let newFilePath: string | null = null;
  if (replacingPhoto && profilePhoto instanceof File) {
    let bytes: Uint8Array;
    try { bytes = await validatedUploadBytes(profilePhoto); } catch (error) {
      if (error instanceof InvalidUploadError) redirect("/profile?error=photo");
      throw error;
    }
    newFileName = `${randomUUID()}.${photoExtensions[profilePhoto.type]}`;
    newFilePath = newFileName;
    await writeMediaFile(newFileName, bytes);
  }
  try {
    await prisma.$transaction(async (tx) => {
      if (replacingPhoto && profilePhoto instanceof File && newFileName) {
        await tx.mediaAsset.upsert({
          where: { id: assetId },
          create: { id: assetId, name: `รูปโปรไฟล์ ${displayName}`, kind: MediaKind.IMAGE, mimeType: profilePhoto.type, sizeBytes: profilePhoto.size, alt: displayName, fileName: newFileName },
          update: { name: `รูปโปรไฟล์ ${displayName}`, kind: MediaKind.IMAGE, mimeType: profilePhoto.type, sizeBytes: profilePhoto.size, alt: displayName, fileName: newFileName },
        });
      }
      await tx.user.update({ where: { id: user.id }, data: {
        displayName, phone, phoneExtension, email, personTypeId, positionId, levelId,
        profileMediaId: replacingPhoto ? assetId : profilePhotoAction === "remove" ? null : undefined,
        profilePhotoFocusX: profilePhotoAction === "remove" ? 50 : profilePhotoFocusX,
        profilePhotoFocusY: profilePhotoAction === "remove" ? 25 : profilePhotoFocusY,
        profilePhotoZoom: profilePhotoAction === "remove" ? 100 : profilePhotoZoom,
        publishPhone: formData.get("publishPhone") === "on",
        publishEmail: formData.get("publishEmail") === "on",
      } });
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: user.id, action: "user.profile.update", entityType: "user", entityId: user.id, summary: `แก้ไขโปรไฟล์ของบัญชี ${user.username}` } });
    });
  } catch (error) {
    if (newFilePath) await deleteMediaFile(newFilePath).catch(() => undefined);
    throw error;
  }
  if (currentAsset?.fileName && replacingPhoto && currentAsset.fileName !== newFileName)
    await deleteMediaFile(currentAsset.fileName).catch(() => undefined);
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
