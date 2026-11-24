import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, KeyRound, ShieldCheck } from "lucide-react";
import { changePasswordPath } from "@/features/auth/return-to";
import { OtherSessionsCard } from "@/features/auth/components/other-sessions-card";
import { countOtherSessions, currentUser } from "@/server/auth/session";
import { hasTotp } from "@/server/auth/totp";

export const instant = false;
export default async function SecurityOverviewPage() {
  const user = await currentUser();
  if (!user) redirect("/login?returnTo=%2Fprofile%2Fsecurity");
  if (user.mustChangePassword) redirect(changePasswordPath("/profile/security"));
  const [otpEnabled, otherSessionCount] = await Promise.all([hasTotp(user.id), countOtherSessions(user.id)]);

  return <main className="security-overview-page"><div className="security-overview-wrap">
    <header className="security-overview-header"><div className="security-overview-shield"><ShieldCheck size={27} strokeWidth={1.9} /></div><h1>ความปลอดภัย</h1><p>จัดการวิธีเข้าสู่ระบบและการป้องกันบัญชีของคุณ</p></header>
    <section className="security-overview-section" aria-label="การตั้งค่าความปลอดภัย">
      <div className="security-overview-card"><span className="security-overview-item-icon"><KeyRound size={20} /></span><span className="security-overview-copy"><strong>รหัสผ่าน</strong><small>เปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบ</small></span><Link href="/change-password?returnTo=%2Fprofile%2Fsecurity" className="security-overview-action">เปลี่ยนรหัสผ่าน</Link></div>
      <Link href="/profile/security/otp" className="security-overview-card security-overview-card-link"><span className="security-overview-item-icon"><ShieldCheck size={20} /></span><span className="security-overview-copy"><strong>การยืนยันตัวตนสองขั้นตอน</strong><small>ใช้แอป Authenticator เพิ่มความปลอดภัยให้บัญชี</small></span><span className="security-overview-end"><span className={`security-overview-status ${otpEnabled ? "is-enabled" : ""}`}>{otpEnabled ? "เปิดใช้งาน" : "ยังไม่เปิด"}</span><ChevronRight className="security-overview-chevron" size={20} aria-hidden="true" /></span></Link>
      <OtherSessionsCard count={otherSessionCount} />
    </section>
  </div></main>;
}
