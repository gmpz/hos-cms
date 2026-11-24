"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { currentUser, createSession } from "@/server/auth/session";
import { authenticate } from "@/server/auth/users";
import { clearTotpSetupAccess, grantTotpSetupAccess, hasTotpSetupAccess } from "@/server/auth/totp-reauth";
import { beginTotpSetup, confirmTotpSetup, disableTotp, getTotpSettingsBlockedUntil, regenerateRecoveryCodes, sealRecoveryCodes } from "@/server/auth/totp";

const recoveryCookie = "hos_cms_recovery_codes";

export async function startTotpAction(previous: { error: string }, formData: FormData) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) redirect("/login");
  const password = String(formData.get("currentPassword") ?? "");
  if (!password) return { error: "กรุณากรอกรหัสผ่านปัจจุบัน" };
  const verified = await authenticate(user.username, password);
  if (!verified || verified.id !== user.id) return { error: "รหัสผ่านไม่ถูกต้อง หรือบัญชีถูกล็อกชั่วคราว" };
  try {
    await beginTotpSetup(user.id, verified.passwordHash);
  } catch (error) {
    if (error instanceof Error && error.message === "REAUTH_EXPIRED") return { error: "ข้อมูลบัญชีเปลี่ยนไป กรุณายืนยันรหัสผ่านอีกครั้ง" };
    throw error;
  }
  await grantTotpSetupAccess(user.id);
  revalidatePath("/profile/security/otp");
  return { error: "" };
}
export async function confirmTotpAction(previous: { error: string; retryAt: string | null; attempt: number }, formData: FormData) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return { error: "กรุณาเข้าสู่ระบบใหม่", retryAt: null, attempt: previous.attempt };
  if (!(await hasTotpSetupAccess(user.id))) {
    await clearTotpSetupAccess();
    redirect("/profile/security/otp?error=reauth-expired");
  }
  const codes = await confirmTotpSetup(user.id, String(formData.get("code") ?? ""));
  if (!codes) { const blocked = await getTotpSettingsBlockedUntil(user.id); return { error: blocked ? "" : "รหัสไม่ถูกต้อง กรุณาลองอีกครั้ง", retryAt: blocked?.toISOString() ?? null, attempt: previous.attempt + 1 }; }
  await createSession(user.id);
  await clearTotpSetupAccess();
  (await cookies()).set(recoveryCookie, sealRecoveryCodes(user.id, codes), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
  redirect("/profile/security/recovery");
}
export async function acknowledgeRecoveryCodesAction() {
  const user = await currentUser();
  if (!user || user.mustChangePassword) redirect("/login");
  (await cookies()).delete(recoveryCookie);
  redirect("/profile/security/otp");
}
export async function regenerateRecoveryCodesAction(previous: { error: string; retryAt: string | null; attempt: number }, formData: FormData) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return { error: "กรุณาเข้าสู่ระบบใหม่", retryAt: null, attempt: previous.attempt };
  const codes = await regenerateRecoveryCodes(user.id, String(formData.get("code") ?? ""));
  if (!codes) { const blocked = await getTotpSettingsBlockedUntil(user.id); return { error: blocked ? "" : "รหัสไม่ถูกต้อง กรุณาลองอีกครั้ง", retryAt: blocked?.toISOString() ?? null, attempt: previous.attempt + 1 }; }
  (await cookies()).set(recoveryCookie, sealRecoveryCodes(user.id, codes), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
  redirect("/profile/security/recovery");
}
export async function disableTotpAction(previous: { error: string; done: boolean; retryAt: string | null; attempt: number }, formData: FormData) {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return { error: "กรุณาเข้าสู่ระบบใหม่", done: false, retryAt: null, attempt: previous.attempt };
  if (!(await disableTotp(user.id, String(formData.get("code") ?? "")))) { const blocked = await getTotpSettingsBlockedUntil(user.id); return { error: blocked ? "" : "รหัสไม่ถูกต้อง", done: false, retryAt: blocked?.toISOString() ?? null, attempt: previous.attempt + 1 }; }
  await createSession(user.id);
  revalidatePath("/profile/security/otp");
  return { error: "", done: true, retryAt: null, attempt: previous.attempt };
}
