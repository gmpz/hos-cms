import Link from "next/link";
import { redirect } from "next/navigation";
import { changePasswordAction, publicLogoutAction } from "@/features/auth/actions";
import { BrandedAuthShell } from "@/features/auth/components/branded-auth-shell";
import { ConfirmPasswordField } from "@/features/auth/components/confirm-password-field";
import { PasswordPolicyField } from "@/features/auth/components/password-policy-field";
import { safeReturnTo } from "@/features/auth/return-to";
import { currentUser } from "@/server/auth/session";

export const instant = false;

const errors: Record<string, string> = {
  invalid: "รหัสผ่านใหม่ต้องครบทุกเงื่อนไข และช่องยืนยันต้องตรงกัน",
  current: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
  same: "รหัสผ่านใหม่ต้องต่างจากรหัสผ่านเดิม",
  unavailable: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง",
};

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo);
  const user = await currentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  const message = query.error ? errors[query.error] : undefined;

  return <BrandedAuthShell
    className="change-password-card"
    eyebrow={`ตั้งค่าบัญชี · ${user.displayName}`}
    title={user.mustChangePassword ? "ตั้งรหัสผ่านใหม่" : "เปลี่ยนรหัสผ่าน"}
    description={user.mustChangePassword ? "กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนเข้าใช้งาน" : "ตั้งรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชี"}
  >
      {message ? <div className="login-error" role="alert">{message}</div> : null}
      <form action={changePasswordAction}>
        <input type="hidden" name="returnTo" value={returnTo}/>
        <label><span>รหัสผ่านปัจจุบัน</span><input name="currentPassword" type="password" autoComplete="current-password" required autoFocus/></label>
        <PasswordPolicyField name="newPassword" label="รหัสผ่านใหม่"/>
        <ConfirmPasswordField />
        <button type="submit">บันทึกรหัสผ่านใหม่</button>
      </form>
      <form action={publicLogoutAction} className="change-password-logout"><button type="submit">ออกจากระบบ</button></form>
      <Link href={user.mustChangePassword ? "/" : returnTo}>
        {user.mustChangePassword ? "← กลับหน้าเว็บไซต์" : "← กลับไปหน้าที่มา"}
      </Link>
  </BrandedAuthShell>;
}
