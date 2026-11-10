"use server";

import { redirect } from "next/navigation";
import { authenticate, changeOwnPassword } from "@/server/auth/users";
import { createSession, currentUser, destroySession } from "@/server/auth/session";
import { changePasswordPath, safeReturnTo } from "./return-to";
import { isValidPassword } from "./password-policy.mjs";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  let mustChangePassword = false;
  try {
    const user = await authenticate(username, password);
    if (!user) redirect(`/login?error=invalid&returnTo=${encodeURIComponent(returnTo)}`);
    await createSession(user.id);
    mustChangePassword = user.mustChangePassword;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/login?error=unavailable&returnTo=${encodeURIComponent(returnTo)}`);
  }
  redirect(mustChangePassword ? changePasswordPath(returnTo) : returnTo);
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
