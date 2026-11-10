import type { AnnouncementDto } from "@/features/announcements/types";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { announcementContentDocument } from "@/features/announcements/announcement-content";
import { RichText } from "@/features/pages/blocks/renderers/rich-text";
import { logoPositionStyle } from "@/features/site-settings/logo-position";
import { WelcomeArtwork } from "@/features/splash-screens/components/welcome-artwork";

type WelcomeBranding = {
  name: string;
  englishName: string;
  logoUrl: string;
  logoFocusX: number;
  logoFocusY: number;
  logoZoom: number;
  primary: string;
  onPrimary: string;
  surface: string;
  onSurface: string;
  accent: string;
};

export function WelcomeView({ splash, branding, preview = false }: { splash: AnnouncementDto; branding: WelcomeBranding; preview?: boolean }) {
  const logoStyle = { backgroundImage: `url(${JSON.stringify(branding.logoUrl)})`, ...logoPositionStyle(branding) };
  const themeStyle = {
    "--welcome-primary": branding.primary,
    "--welcome-on-primary": branding.onPrimary,
    "--welcome-surface": branding.surface,
    "--welcome-on-surface": branding.onSurface,
    "--welcome-accent": branding.accent,
  } as CSSProperties;
  return <main className={`welcome-page${preview ? " welcome-preview" : ""}`} style={themeStyle}>
    <div className="welcome-content">
      {splash.contentMode === "IMAGE" && splash.imageUrl ? <span className="welcome-backdrop" style={{ backgroundImage: `url(${JSON.stringify(splash.imageUrl)})` }} aria-hidden="true"/> : null}
      {splash.contentMode === "IMAGE" ? splash.imageUrl ? <WelcomeArtwork src={splash.imageUrl} alt={splash.imageAlt || splash.title}/> : null : <div className="welcome-text"><h1>{splash.title}</h1><RichText content={announcementContentDocument(splash.description)}/></div>}
    </div>
    <footer className="welcome-footer"><div className="welcome-footer-inner">
      <div className="welcome-brand">
        <span className="welcome-brand-logo" style={logoStyle} aria-hidden="true"/>
        <span className="welcome-brand-divider" aria-hidden="true"/>
        <span className="welcome-brand-names"><strong>{branding.name}</strong>{branding.englishName ? <small>{branding.englishName}</small> : null}</span>
      </div>
      {preview ? <a className="welcome-enter" href={`/admin/splash-screens/${splash.id}/edit`}>กลับไปแก้ไข<span className="welcome-enter-icon" aria-hidden="true"><ArrowRight size={22}/></span></a> :
        <form method="post" action="/api/welcome/enter"><input type="hidden" name="id" value={splash.id}/><button className="welcome-enter" type="submit"><span>{splash.buttonLabel || "เข้าสู่เว็บไซต์"}</span><span className="welcome-enter-icon" aria-hidden="true"><ArrowRight size={22}/></span></button></form>}
    </div></footer>
  </main>;
}
