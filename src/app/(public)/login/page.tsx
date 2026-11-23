import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/features/auth/actions";
import { BrandedAuthShell } from "@/features/auth/components/branded-auth-shell";
import { currentUser } from "@/server/auth/session";
import { changePasswordPath, safeReturnTo } from "@/features/auth/return-to";

export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo);
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? changePasswordPath(returnTo) : returnTo);
  const message = query.error === "session-expired" ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" : query.error === "invalid" ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับชั่วคราว" : query.error === "unavailable" ? "ยังเชื่อมต่อระบบสมาชิกไม่ได้ กรุณาติดต่อผู้ดูแลระบบ" : null;
  return <BrandedAuthShell eyebrow="ระบบสำหรับบุคลากร" title="เข้าสู่ระบบ" description="ใช้บัญชีที่ผู้ดูแลระบบโรงพยาบาลสร้างให้">
      {message ? <div className="login-error" role="alert">{message}</div> : null}
      <form action={loginAction}>
        <input type="hidden" name="returnTo" value={returnTo}/>
        <label><span>ชื่อผู้ใช้</span><input name="username" autoComplete="username" required autoFocus/></label>
        <label><span>รหัสผ่าน</span><input name="password" type="password" autoComplete="current-password" required/></label>
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
      <Link href="/">← กลับหน้าเว็บไซต์</Link>
  </BrandedAuthShell>;
}
