"use server";

import { redirect } from "next/navigation";
import { authenticate, changeOwnPassword } from "@/server/auth/users";
import { createSession, currentUser, destroySession, setSessionCookie } from "@/server/auth/session";
import { changePasswordPath, safeReturnTo } from "./return-to";
import { isValidPassword } from "./password-policy.mjs";
import { cookies } from "next/headers";
import { beginLoginAfterPassword, completeOtpLogin } from "@/server/auth/otp-login";

const challengeCookie = "hos_cms_otp_challenge";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  let destination = returnTo;
  try {
    const user = await authenticate(username, password);
    if (!user) redirect(`/login?error=invalid&returnTo=${encodeURIComponent(returnTo)}`);
    const started = await beginLoginAfterPassword(user.id, user.passwordHash, user.totpEnabled, returnTo);
    if (started.kind === "invalid") redirect(`/login?error=invalid&returnTo=${encodeURIComponent(returnTo)}`);
    if (started.kind === "otp") {
      (await cookies()).set(challengeCookie, started.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
      destination = "/login/otp";
    } else {
      await setSessionCookie(started.session);
      destination = started.mustChangePassword ? changePasswordPath(returnTo) : returnTo;
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/login?error=unavailable&returnTo=${encodeURIComponent(returnTo)}`);
  }
  redirect(destination);
}

export async function verifyOtpAction(previous: { error: string; attempt: number }, formData: FormData) {
  const token = (await cookies()).get(challengeCookie)?.value;
  if (!token) redirect("/login?error=session-expired");
  const code = String(formData.get("code") ?? "");
  const result = await completeOtpLogin(token, code);
  if (result.kind === "expired" || result.kind === "challenge-limit") {
    (await cookies()).delete(challengeCookie);
    redirect(result.kind === "challenge-limit" ? "/login?error=otp-attempts" : "/login?error=session-expired");
  }
  if (result.kind === "account-limit") redirect("/login/otp?error=invalid");
  if (result.kind === "invalid") {
    return { error: "รหัสไม่ถูกต้องหรือถูกใช้แล้ว กรุณาลองอีกครั้ง", attempt: previous.attempt + 1 };
  }
  (await cookies()).delete(challengeCookie);
  await setSessionCookie(result.session);
  redirect(result.mustChangePassword ? changePasswordPath(result.returnTo) : result.returnTo);
}

export async function changePasswordAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const pagePath = changePasswordPath(returnTo);
  const user = await currentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`);
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!isValidPassword(newPassword) || newPassword !== confirmPassword)
    redirect(`${pagePath}&error=invalid`);
  let errorCode: string | null = null;
  try {
    if (!(await changeOwnPassword(user.id, currentPassword, newPassword))) errorCode = "current";
    else await createSession(user.id);
  } catch (error) {
    errorCode = error instanceof Error && error.message === "SAME_PASSWORD" ? "same" : "unavailable";
  }
  if (errorCode) redirect(`${pagePath}&error=${errorCode}`);
  redirect(returnTo);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function publicLogoutAction() {
  await destroySession();
  redirect("/");
}
