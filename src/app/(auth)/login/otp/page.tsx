import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { OtpChallengeForm } from "@/features/auth/components/otp-challenge-form";
import { BrandedAuthShell } from "@/features/auth/components/branded-auth-shell";
import { prisma } from "@/server/database/prisma";
import { hashChallengeToken } from "@/server/auth/totp";
import { otpRetryAt } from "@/server/auth/otp-limit";

export const instant = false;
export default async function OtpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const token = (await cookies()).get("hos_cms_otp_challenge")?.value;
  if (!token) redirect("/login");
  const challenge = await prisma.loginChallenge.findUnique({ where: { tokenHash: hashChallengeToken(token) }, select: { userId: true, attempts: true, expiresAt: true } });
  if (!challenge || challenge.expiresAt <= new Date()) redirect("/login?error=session-expired");
  const now = new Date();
  const attempts = await prisma.loginChallenge.findMany({ where: { userId: challenge.userId, attempts: { gt: 0 }, createdAt: { gt: new Date(now.getTime() - 15 * 60000) } }, select: { attempts: true, createdAt: true } });
  const retryAt = otpRetryAt(attempts, now);
  if (!retryAt && challenge.attempts >= 5) redirect("/login?error=otp-attempts");
  const { error } = await searchParams;
  return <BrandedAuthShell className="otp-login-card" logoOnly title="ยืนยันตัวตน" description="กรอกรหัสจากแอป Authenticator เพื่อเข้าสู่ระบบ">
    {retryAt ? <div className="login-error otp-limit-error" role="alert"><strong>ลองรหัสยืนยันหลายครั้งเกินไป</strong><span>เริ่มเข้าสู่ระบบใหม่หลัง <time dateTime={retryAt.toISOString()}>{new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(retryAt)} น.</time></span></div> : error ? <div className="login-error" role="alert">รหัสไม่ถูกต้องหรือถูกใช้แล้ว กรุณาลองอีกครั้ง</div> : null}
    {retryAt ? null : <OtpChallengeForm />}
    <Link href="/login">← กลับไปหน้าเข้าสู่ระบบ</Link>
  </BrandedAuthShell>;
}
