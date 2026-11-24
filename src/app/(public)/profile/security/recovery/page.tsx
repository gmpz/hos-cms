import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { currentUser } from "@/server/auth/session";
import { openRecoveryCodes } from "@/server/auth/totp";
import { acknowledgeRecoveryCodesAction } from "@/features/auth/totp-actions";
import { CopyRecoveryCodesButton } from "@/features/auth/components/copy-recovery-codes-button";

export const instant = false;
export default async function RecoveryCodesPage() {
  const user = await currentUser();
  if (!user || user.mustChangePassword) redirect("/login");
  const cookie = (await cookies()).get("hos_cms_recovery_codes")?.value;
  const codes = cookie ? openRecoveryCodes(cookie, user.id) : null;
  if (!codes) redirect("/profile/security/otp");

  return <main className="otp-settings-page"><div className="otp-settings-wrap">
    <header className="otp-settings-header"><div><h1>บันทึกรหัสกู้บัญชี</h1><p className="otp-settings-lead">เก็บรหัสชุดใหม่นี้ไว้ในที่ปลอดภัย ก่อนออกจากหน้านี้</p></div></header>
    <section className="otp-settings-card otp-recovery-page-card">
      <div className="otp-settings-content">
        <div className="otp-info-box"><KeyRound size={21} /><p>ใช้รหัสกู้บัญชีแทนรหัสจากแอปเมื่อโทรศัพท์หายหรือเข้าแอปไม่ได้ แต่ละรหัสใช้ได้เพียงครั้งเดียว</p></div>
        <div className="otp-recovery-list"><ul>{codes.map((code, index) => <li key={code}><span>{String(index + 1).padStart(2, "0")}</span><code>{code}</code></li>)}</ul></div>
        <CopyRecoveryCodesButton codes={codes} />
        <p className="otp-recovery-note">รหัสชุดนี้จะแสดงเฉพาะตอนนี้ และไม่สามารถเปิดดูย้อนหลังได้</p>
        <form action={acknowledgeRecoveryCodesAction}><button type="submit" className="otp-primary-button">บันทึกรหัสไว้แล้ว</button></form>
      </div>
    </section>
  </div></main>;
}
