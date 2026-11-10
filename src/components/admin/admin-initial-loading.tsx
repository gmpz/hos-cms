import Image from "next/image";
import type { CSSProperties } from "react";
import type { ThemeTokens } from "@/features/site-settings/types";

export function AdminInitialLoading({ theme }: { theme: ThemeTokens }) {
  const style = {
    "--loading-primary": theme.primary,
    "--loading-secondary": theme.secondary,
  } as CSSProperties;

  return (
    <main
      className="admin-initial-loading"
      style={style}
      role="status"
      aria-live="polite"
      aria-label="กำลังเปิดระบบจัดการเว็บไซต์"
    >
      <div className="admin-initial-loading-glow" aria-hidden="true" />
      <section className="admin-initial-loading-panel">
        <div className="admin-initial-loading-logo">
          <span className="admin-initial-loading-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <Image
            src="/hospital-logo.png"
            width={88}
            height={88}
            priority
            alt="โลโก้โรงพยาบาลคลองหลวง"
          />
        </div>

        <div className="admin-initial-loading-copy">
          <p>โรงพยาบาลคลองหลวง</p>
          <h1>ระบบจัดการเว็บไซต์</h1>
          <span>กำลังเตรียมพื้นที่ทำงาน...</span>
        </div>

        <div className="admin-initial-loading-progress" aria-hidden="true">
          <i />
        </div>
      </section>

      <p className="admin-initial-loading-footer">Hospital Content Management System</p>
    </main>
  );
}
