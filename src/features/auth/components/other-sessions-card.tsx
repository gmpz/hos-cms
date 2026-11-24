"use client";

import { useState, useTransition } from "react";
import { MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showGlobalToast } from "@/components/ui/global-toast";
import { revokeOwnOtherSessionsAction } from "@/features/auth/session-actions";

export function OtherSessionsCard({ count }: { count: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      try {
        const result = await revokeOwnOtherSessionsAction();
        showGlobalToast({ title: result.ok ? "ดำเนินการเรียบร้อย" : "ดำเนินการไม่สำเร็จ", description: result.message, variant: result.ok ? "success" : "error" });
        if (result.ok) router.refresh();
      } catch {
        showGlobalToast({ title: "ดำเนินการไม่สำเร็จ", description: "ออกจากอุปกรณ์อื่นไม่สำเร็จ กรุณาลองใหม่", variant: "error" });
      } finally {
        setConfirming(false);
      }
    });
  }

  return <>
    <div className="security-overview-card security-overview-session-card">
      <span className="security-overview-item-icon"><MonitorSmartphone size={20} /></span>
      <span className="security-overview-copy"><strong>อุปกรณ์ที่เข้าสู่ระบบ</strong><small>{count ? `มีการเข้าสู่ระบบอื่นอีก ${count} เซสชัน` : "ไม่มีเซสชันอื่นที่กำลังใช้งาน"}</small></span>
      <button type="button" className="security-overview-action" disabled={!count || pending} onClick={() => setConfirming(true)}>ออกจากอุปกรณ์อื่น</button>
    </div>
    {confirming ? <ConfirmDialog
      title="ออกจากอุปกรณ์อื่นทั้งหมด?"
      description="เซสชันอื่นจะต้องเข้าสู่ระบบใหม่ ส่วนอุปกรณ์ที่กำลังใช้อยู่จะยังอยู่ในระบบ"
      confirmLabel="ออกจากอุปกรณ์อื่น"
      variant="default"
      pending={pending}
      pendingLabel="กำลังออกจากระบบ..."
      onClose={() => { if (!pending) setConfirming(false); }}
      onConfirm={revoke}
    /> : null}
  </>;
}
