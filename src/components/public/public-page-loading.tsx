import Image from "next/image";
import type { CSSProperties } from "react";
import type { ThemeTokens } from "@/features/site-settings/types";

export function PublicPageLoading({ label }: { label: string }) {
  return (
    <div className="admin-content-loading public-content-loading-level-two" data-public-page-loading="" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="admin-content-loading-indicator" aria-hidden="true">
        <span className="admin-content-loading-dots"><i /><i /><i /></span>
        <b className="admin-content-loading-percentage" />
        <p>กรุณารอสักครู่...</p>
      </div>
      <span className="public-loading-sr-only">{label}</span>
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

export function PublicUnitLoading() {
  return (
    <article className="public-unit public-unit-loading" role="status" aria-busy="true" aria-live="polite" aria-label="กำลังโหลดข้อมูลหน่วยงาน">
      <header className="unit-hero public-unit-loading-hero" aria-hidden="true">
        <div>
          <span className="public-loading-shape public-unit-loading-eyebrow" />
          <span className="public-loading-shape public-unit-loading-title" />
          <span className="public-loading-shape public-unit-loading-summary" />
        </div>
      </header>
      <section className="unit-public-section public-unit-loading-section" aria-hidden="true">
        <span className="public-loading-shape public-unit-loading-section-title" />
        <div className="public-unit-loading-cards">
          <span className="public-loading-shape" />
          <span className="public-loading-shape" />
        </div>
      </section>
      <span className="public-loading-sr-only">กำลังโหลดข้อมูลหน่วยงาน...</span>
    </article>
  );
}

export function PublicAuthLoading({ label }: { label: string }) {
  return (
    <main className="login-screen" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <section className="login-card public-auth-loading" aria-hidden="true">
        <span className="public-loading-shape public-auth-loading-mark" />
        <span className="public-loading-shape public-auth-loading-eyebrow" />
        <span className="public-loading-shape public-auth-loading-title" />
        <span className="public-loading-shape public-auth-loading-copy" />
        <span className="public-loading-shape public-auth-loading-field" />
        <span className="public-loading-shape public-auth-loading-field" />
        <span className="public-loading-shape public-auth-loading-button" />
      </section>
      <span className="public-loading-sr-only">{label}</span>
    </main>
  );
}
