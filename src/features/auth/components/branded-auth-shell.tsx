import type { CSSProperties, ReactNode } from "react";
import { logoPositionStyle } from "@/features/site-settings/logo-position";
import { getWelcomeBranding } from "@/server/splash-screens/branding";

type BrandedAuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export async function BrandedAuthShell({ eyebrow, title, description, children, className }: BrandedAuthShellProps) {
  const branding = await getWelcomeBranding();
  const themeStyle = {
    "--primary": branding.primary,
    "--foreground": branding.onSurface,
    "--login-surface": branding.surface,
    "--login-on-primary": branding.onPrimary,
    "--login-accent": branding.accent,
  } as CSSProperties;
  const logoStyle = {
    backgroundImage: `url("${branding.logoUrl}")`,
    ...logoPositionStyle(branding),
  };

  return <main className="login-screen login-screen-branded" style={themeStyle}>
    <section className={["login-card", "login-card-branded", className].filter(Boolean).join(" ")}>
      <div className="login-brand">
        <span className="login-brand-logo" role="img" aria-label={`โลโก้${branding.name}`} style={logoStyle} />
        <strong>{branding.name}</strong>
        {branding.englishName ? <span className="login-brand-english">{branding.englishName}</span> : null}
      </div>
      <div className="login-intro">
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  </main>;
}
