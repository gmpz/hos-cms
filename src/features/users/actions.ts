"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { deleteMediaFile, writeMediaFile } from "@/server/media/storage";
import { createProfileMaster, createUser, deleteProfileMaster, deleteUser, moveProfileMaster, resetUserPassword, revokeUserSessions, setUserStatus, updateProfileMaster, updateUser } from "@/server/auth/users";
import { isValidPhone, isValidPhoneExtension, phoneDigits } from "./phone";
import { isValidPassword } from "@/features/auth/password-policy.mjs";

const profilePhotoExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type UserActionResult = { ok: boolean; message: string; userId?: string };

async function requireAdmin() {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) throw new Error("UNAUTHORIZED");
  return user;
}
function messageFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "ชื่อผู้ใช้นี้มีอยู่แล้ว";
  if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") return "ไม่สามารถปิดบัญชีหรือลดสิทธิ์ผู้ดูแลระบบคนสุดท้ายได้";
  if (error instanceof Error && error.message === "USER_NOT_FOUND") return "ไม่พบบัญชีผู้ใช้นี้";
  if (error instanceof Error && error.message === "USER_LINKED_TO_UNIT") return "บัญชีนี้ยังเชื่อมกับบุคลากรหรือสิทธิ์ในหน่วยงาน กรุณานำออกจากหน่วยงานก่อนลบ";
  if (error instanceof Error && error.message === "SELF_ACTION") return "ไม่สามารถดำเนินการนี้กับบัญชีที่กำลังใช้งานอยู่";
  if (error instanceof Error && error.message === "UNAUTHORIZED") return "คุณไม่มีสิทธิ์ดำเนินการ";
  if (error instanceof Error && error.message === "INVALID_PASSWORD") return "รหัสผ่านไม่ครบตามเงื่อนไขที่กำหนด";
  if (error instanceof Error && (error.message === "INVALID_PROFILE_REFERENCE" || error.message === "INVALID_PRIMARY_UNIT")) return "ข้อมูลโปรไฟล์หรือหน่วยงานไม่ถูกต้อง กรุณาโหลดหน้าใหม่";
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return "มีการเปลี่ยนแปลงบัญชีพร้อมกัน กรุณาลองใหม่";
  return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
}

export async function createUserAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const username = String(formData.get("username") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
    if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username) || displayName.length < 2 || displayName.length > 160)
      return { ok: false, message: "กรุณาตรวจสอบชื่อผู้ใช้และชื่อที่แสดง" };
    if (!isValidPassword(password)) return { ok: false, message: "รหัสผ่านไม่ครบตามเงื่อนไขที่กำหนด" };
    const created = await createUser({ username, displayName, password, role }, actor.id);
    revalidatePath("/admin/users");
    return { ok: true, message: "สร้างบัญชีเรียบร้อยแล้ว", userId: created.id };
  } catch (error) { return { ok: false, message: messageFor(error) }; }
}
export async function createProfileMasterAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const kind = formData.get("kind");
    const name = String(formData.get("name") ?? "").trim();
    if ((kind !== "PERSON_TYPE" && kind !== "POSITION" && kind !== "LEVEL") || !name || name.length > 160) return { ok: false, message: "กรุณาระบุประเภทและชื่อข้อมูลโปรไฟล์" };
    await createProfileMaster({ kind, name }, actor.id);
    revalidatePath("/admin/profile-masters");
    revalidatePath("/admin/users");
    return { ok: true, message: "เพิ่มตัวเลือกโปรไฟล์แล้ว" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "ตัวเลือกโปรไฟล์นี้มีอยู่แล้ว" };
    return { ok: false, message: messageFor(error) };
  }
}
export async function updateProfileMasterAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const mode = String(formData.get("mode") ?? "");
    if (!id) return { ok: false, message: "ไม่พบรายการที่ต้องการแก้ไข" };
    if (mode === "rename") {
      const name = String(formData.get("name") ?? "").trim();
      if (!name || name.length > 160) return { ok: false, message: "ชื่อรายการต้องมี 1–160 ตัวอักษร" };
      await updateProfileMaster(id, { name }, actor.id);
    } else if (mode === "active") {
      await updateProfileMaster(id, { active: formData.get("active") === "true" }, actor.id);
    } else return { ok: false, message: "คำสั่งไม่ถูกต้อง" };
    revalidatePath("/admin/profile-masters");
    revalidatePath("/admin/users");
    return { ok: true, message: mode === "rename" ? "เปลี่ยนชื่อรายการแล้ว" : "เปลี่ยนสถานะรายการแล้ว" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "มีรายการชื่อนี้อยู่แล้ว" };
    return { ok: false, message: messageFor(error) };
  }
}
export async function moveProfileMasterAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const direction = formData.get("direction");
    if (!id || (direction !== "up" && direction !== "down")) return { ok: false, message: "คำสั่งจัดลำดับไม่ถูกต้อง" };
    await moveProfileMaster(id, direction, actor.id);
    revalidatePath("/admin/profile-masters");
    revalidatePath("/admin/users");
    return { ok: true, message: "จัดลำดับรายการแล้ว" };
  } catch (error) { return { ok: false, message: messageFor(error) }; }
}
export async function deleteProfileMasterAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, message: "ไม่พบรายการที่ต้องการลบ" };
    await deleteProfileMaster(id, actor.id);
    revalidatePath("/admin/profile-masters");
    revalidatePath("/admin/users");
    return { ok: true, message: "ลบรายการแล้ว" };
  } catch (error) {
    if (error instanceof Error && error.message === "PROFILE_MASTER_IN_USE") return { ok: false, message: "รายการนี้มีผู้ใช้งานอยู่ ไม่สามารถลบได้" };
    return { ok: false, message: messageFor(error) };
  }
}
export async function updateUserAction(formData: FormData): Promise<UserActionResult> {
  let newFilePath: string | null = null;
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const roleValue = formData.get("role");
    if (roleValue !== "ADMIN" && roleValue !== "MEMBER") return { ok: false, message: "กรุณาเลือกบทบาทผู้ใช้" };
    const role = roleValue;
    const nullable = (name: string) => { const value = String(formData.get(name) ?? ""); return value || null; };
    const phone = phoneDigits(String(formData.get("phone") ?? ""));
    const phoneExtension = phoneDigits(String(formData.get("phoneExtension") ?? ""), 6);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const unitIds = [...new Set(formData.getAll("unitIds").map(String).filter(Boolean))];
    const primaryUnitId = nullable("primaryUnitId");
    const photoActionValue = String(formData.get("profilePhotoAction") ?? "keep");
    const photoAction = photoActionValue === "replace" || photoActionValue === "remove" ? photoActionValue : "keep";
    const photoFile = formData.get("profilePhoto");
    const focusX = Number(formData.get("profilePhotoFocusX") ?? 50);
    const focusY = Number(formData.get("profilePhotoFocusY") ?? 25);
    const zoom = Number(formData.get("profilePhotoZoom") ?? 100);
    if (!id || displayName.length < 2 || displayName.length > 160) return { ok: false, message: "ชื่อที่แสดงต้องมี 2–160 ตัวอักษร" };
    if (!isValidPhone(phone) || !isValidPhoneExtension(phoneExtension) || (phoneExtension && !phone) || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { ok: false, message: "หมายเลขโทรศัพท์ เบอร์ต่อ หรืออีเมลไม่ถูกต้อง" };
    if (!Number.isInteger(focusX) || focusX < 0 || focusX > 100 || !Number.isInteger(focusY) || focusY < 0 || focusY > 100 || !Number.isInteger(zoom) || zoom < 100 || zoom > 300) return { ok: false, message: "ตำแหน่งหรือขนาดรูปไม่ถูกต้อง" };
    if (photoAction === "replace" && (!(photoFile instanceof File) || photoFile.size === 0 || photoFile.size > 5 * 1024 * 1024 || !profilePhotoExtensions[photoFile.type])) return { ok: false, message: "รองรับรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" };
    if (id === actor.id && role !== "ADMIN") throw new Error("SELF_ACTION");
    const currentAsset = await prisma.mediaAsset.findUnique({ where: { id: `profile:${id}` }, select: { fileName: true } });
    const newFileName = photoAction === "replace" && photoFile instanceof File ? `${randomUUID()}.${profilePhotoExtensions[photoFile.type]}` : undefined;
    if (newFileName && photoFile instanceof File) { newFilePath = newFileName; await writeMediaFile(newFileName, new Uint8Array(await photoFile.arrayBuffer())); }
    await updateUser(id, {
      displayName, role, phone, phoneExtension, email, unitIds, primaryUnitId,
      personTypeId: nullable("personTypeId"), positionId: nullable("positionId"), levelId: nullable("levelId"), profileMediaId: nullable("profileMediaId"),
      publishPhone: formData.get("publishPhone") === "on", publishEmail: formData.get("publishEmail") === "on",
      profilePhoto: { action: photoAction, fileName: newFileName, mimeType: photoFile instanceof File ? photoFile.type : undefined, sizeBytes: photoFile instanceof File ? photoFile.size : undefined, focusX, focusY, zoom },
    }, actor.id);
    if (currentAsset?.fileName && photoAction === "replace" && currentAsset.fileName !== newFileName) await deleteMediaFile(currentAsset.fileName).catch(() => undefined);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}/edit`);
    return { ok: true, message: "บันทึกข้อมูลผู้ใช้แล้ว" };
  } catch (error) { if (newFilePath) await deleteMediaFile(newFilePath).catch(() => undefined); return { ok: false, message: messageFor(error) }; }
}
export async function setUserStatusAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const status = formData.get("status") === "DISABLED" ? "DISABLED" : "ACTIVE";
    if (!id) return { ok: false, message: "ไม่พบบัญชีผู้ใช้" };
    if (id === actor.id && status === "DISABLED") throw new Error("SELF_ACTION");
    await setUserStatus(id, status, actor.id);
    revalidatePath("/admin/users");
    return { ok: true, message: status === "DISABLED" ? "ปิดบัญชีและออกจากระบบทุกอุปกรณ์แล้ว" : "เปิดใช้งานบัญชีแล้ว" };
  } catch (error) { return { ok: false, message: messageFor(error) }; }
}
export async function deleteUserAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "รหัสบัญชีผู้ใช้ไม่ถูกต้อง" };
    await deleteUser(id, actor.id);
    revalidatePath("/admin/users");
    return { ok: true, message: "ลบบัญชีผู้ใช้ถาวรแล้ว" };
  } catch (error) { return { ok: false, message: messageFor(error) }; }
}
export async function resetPasswordAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!id) return { ok: false, message: "ไม่พบบัญชีผู้ใช้" };
    if (!isValidPassword(password)) return { ok: false, message: "รหัสผ่านไม่ครบตามเงื่อนไขที่กำหนด" };
    await resetUserPassword(id, password, actor.id);
    revalidatePath("/admin/users");
    return { ok: true, message: id === actor.id ? "รีเซ็ตรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่" : "รีเซ็ตรหัสผ่านและออกจากระบบทุกอุปกรณ์แล้ว" };
  } catch (error) { return { ok: false, message: messageFor(error) }; }
}
export async function revokeSessionsAction(formData: FormData): Promise<UserActionResult> {
  try {
    const actor = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, message: "ไม่พบบัญชีผู้ใช้" };
    await revokeUserSessions(id, actor.id);
    revalidatePath("/admin/users");
    return { ok: true, message: "บังคับออกจากระบบทุกอุปกรณ์แล้ว" };
  } catch (error) { return { ok: false, message: messageFor(error) }; }
}
