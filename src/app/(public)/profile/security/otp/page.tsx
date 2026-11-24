import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { currentUser } from "@/server/auth/session";
import { hasTotpSetupAccess } from "@/server/auth/totp-reauth";
import { getTotpSettingsBlockedUntil, hasTotp, pendingTotpSecret } from "@/server/auth/totp";
import { ConfirmTotpForm, EnabledTotpSettings, StartTotpForm } from "@/features/auth/components/totp-settings-forms";
import { CopySetupKeyButton } from "@/features/auth/components/copy-setup-key-button";
import { changePasswordPath } from "@/features/auth/return-to";

export const instant = false;
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?returnTo=%2Fprofile%2Fsecurity%2Fotp");
  if (user.mustChangePassword) redirect(changePasswordPath("/profile/security/otp"));
  const enabled = await hasTotp(user.id);
  const blockedUntil = (await getTotpSettingsBlockedUntil(user.id))?.toISOString() ?? null;
  const mayContinueSetup = !enabled && await hasTotpSetupAccess(user.id);
  const secret = mayContinueSetup ? await pendingTotpSecret(user.id) : null;
  const expired = (await searchParams).error === "reauth-expired";
  const uri = secret ? `otpauth://totp/${encodeURIComponent("Hospital CMS")}?secret=${secret}&issuer=${encodeURIComponent("Hospital CMS")}&algorithm=SHA1&digits=6&period=30` : null;
  const qrDataUrl = uri ? `data:image/svg+xml;base64,${Buffer.from(await QRCode.toString(uri, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 224, color: { dark: "#183a34", light: "#ffffff" } })).toString("base64")}` : null;

  return <main className="otp-settings-page">
    <div className="otp-settings-wrap">
      <Link className="otp-back-link" href="/profile/security"><ArrowLeft size={17} /> กลับไปความปลอดภัย</Link>
      <header className="otp-settings-header">
        <div><h1>การยืนยันตัวตนสองขั้นตอน</h1><p className="otp-settings-lead">เพิ่มความปลอดภัยเมื่อเข้าสู่ระบบด้วยรหัสจากแอป Authenticator</p></div>
      </header>
      {enabled && <div className="otp-info-box success otp-status-panel"><CheckCircle2 size={22} /><div><strong>บัญชีของคุณมีการป้องกันเพิ่มเติมแล้ว</strong><p>ทุกครั้งที่เข้าสู่ระบบใหม่ ระบบจะขอรหัสจากแอป Authenticator หรือรหัสกู้บัญชี</p></div></div>}

      <section className="otp-settings-card" aria-labelledby="otp-status-title">
        <div className="otp-settings-card-head">
          <div><h2 id="otp-status-title">รหัส OTP</h2><p>สำหรับบัญชี <strong>{user.username}</strong></p></div>
          <span className={`otp-status ${enabled ? "is-enabled" : ""}`}><span className="otp-status-dot" />{enabled ? "เปิดใช้งาน" : secret ? "กำลังตั้งค่า" : "ยังไม่เปิดใช้งาน"}</span>
        </div>

        {enabled ? <EnabledTotpSettings initialBlockedUntil={blockedUntil} /> : secret ? <div className="otp-settings-content otp-enrollment-content">
          <div className="otp-enrollment-heading"><span className="otp-step-number">1</span><div><h3>เพิ่มบัญชีในแอป Authenticator</h3><p>เปิด Google Authenticator แล้วสแกน QR code</p></div></div>
          <div className="otp-enrollment-grid">
            {qrDataUrl && <div className="otp-qr-panel"><Image unoptimized src={qrDataUrl} width={224} height={224} alt="QR code สำหรับเพิ่มบัญชี Hospital CMS ในแอป Authenticator" /><span>สแกนด้วยแอป Authenticator</span></div>}
            <div className="otp-enrollment-manual"><h4>สแกนไม่ได้?</h4><p>เลือกเพิ่มบัญชีด้วยคีย์ตั้งค่า แล้วกรอกข้อมูลด้านล่าง</p><div className="otp-secret-box"><div className="otp-secret-box-head"><span>คีย์ตั้งค่า</span><CopySetupKeyButton secret={secret} /></div><code>{secret}</code></div></div>
          </div>
          <div className="otp-enrollment-verify"><div className="otp-enrollment-heading"><span className="otp-step-number">2</span><div><h3>ยืนยันรหัส 6 หลัก</h3><p>กรอกรหัสที่แอปแสดงเพื่อเปิดใช้งาน OTP</p></div></div><ConfirmTotpForm initialBlockedUntil={blockedUntil} /></div>
        </div> : <div className="otp-settings-content">
          <div className="otp-intro-row"><div className="otp-intro-icon"><Smartphone size={25} /></div><div><h3>เพิ่มอีกหนึ่งขั้นตอนในการเข้าสู่ระบบ</h3><p>หลังกรอกรหัสผ่าน ระบบจะขอรหัส 6 หลักจากแอปในโทรศัพท์ของคุณ คุณเลือกเปิดหรือปิดได้เอง</p></div></div>
          <div className="otp-info-box"><KeyRound size={20} /><p>เมื่อตั้งค่าสำเร็จ คุณจะได้รับรหัสกู้บัญชีสำหรับใช้เมื่อไม่มีโทรศัพท์</p></div>
          <StartTotpForm expired={expired} />
        </div>}
      </section>
    </div>
  </main>;
}
