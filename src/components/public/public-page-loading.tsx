import Image from "next/image";
import type { CSSProperties } from "react";
import type { ThemeTokens } from "@/features/site-settings/types";

export function PublicPageLoading({ label }: { label: string }) {
  return (
    <div className="public-content-loading-level-two public-route-loading" data-public-page-loading="" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="public-route-loading-indicator">
        <span className="public-route-loading-spinner" aria-hidden="true" />
        <span>กำลังโหลดเนื้อหา...</span>
      </div>
    </div>
  );
}

export function PublicInitialLoading({ theme, overlay = false }: { theme?: ThemeTokens; overlay?: boolean }) {
  const style = theme ? {
    "--loading-primary": theme.primary,
    "--loading-secondary": theme.secondary,
  } as CSSProperties : undefined;

  const content = <>
    <div className="admin-initial-loading-glow" aria-hidden="true" />
    <section className="admin-initial-loading-panel">
      <div className="admin-initial-loading-logo">
        <span className="admin-initial-loading-signal" aria-hidden="true"><i /><i /><i /></span>
        <Image src="/hospital-logo.png" width={88} height={88} priority alt="โลโก้โรงพยาบาลคลองหลวง" />
      </div>
      <div className="admin-initial-loading-copy">
        <p>โรงพยาบาลคลองหลวง</p>
        <span>กำลังเตรียมหน้าเว็บไซต์...</span>
      </div>
      <div className="admin-initial-loading-progress" aria-hidden="true"><i /></div>
    </section>
    <p className="admin-initial-loading-footer">Khlong Luang Hospital</p>
  </>;

  return overlay
    ? <div className="admin-initial-loading public-initial-loading public-home-loading-overlay" data-public-page-loading="" style={style} role="status" aria-live="polite" aria-label="กำลังเปิดเว็บไซต์โรงพยาบาล">{content}</div>
    : <main className="admin-initial-loading public-initial-loading" data-public-page-loading="" style={style} role="status" aria-live="polite" aria-label="กำลังเปิดเว็บไซต์โรงพยาบาล">{content}</main>;
}

export function PublicAuthLoading({ label }: { label: string }) {
  return (
    <main className="login-screen" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="public-route-loading-indicator">
        <span className="public-route-loading-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </main>
  );
}
