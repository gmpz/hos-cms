"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode, type CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { mediaPreviewStyle } from "@/features/media/demo/media-registry";
import {
  pagesChangeEvent,
  readPageSummaries,
  refreshPublicPageSummaries,
} from "@/features/pages/demo/page-list-storage";
import {
  readSiteSettings,
  refreshSiteSettings,
  siteSettingsChangedEvent,
} from "@/features/site-settings/demo/storage";
import type { SiteSettings } from "@/features/site-settings/types";
import { foregroundFor } from "@/features/site-settings/theme-contrast";
import { PublicNavigation } from "@/features/navigation/components/public-navigation";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { isGoogleMapsUrl } from "@/features/site-settings/map-url";
import { isSocialUrl } from "@/features/site-settings/social-url";
import { logoPositionStyle } from "@/features/site-settings/logo-position";
import { ChevronRight, LogIn, Mail, MapPin, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Phone, Play, Search, X } from "lucide-react";
import { displayMediaFor } from "@/features/media/resolved-media";
import { PublicVisitTracker } from "@/features/analytics/components/public-visit-tracker";
import { PublicVisitTotal } from "@/features/analytics/components/public-visit-total";
import { LinkTargetCatalogProvider } from "@/features/navigation/link-target-catalog-context";
import type { LinkTargetCatalog } from "@/features/navigation/resolve-link-target";
import type { Navigation } from "@/features/navigation/types";
import { seedCategories } from "@/features/categories/demo/storage";
import type { DemoCategory } from "@/features/categories/types";

type PublicShellClientProps = {
  children: ReactNode;
  initialSettings: SiteSettings;
  initialNavigation: Navigation;
  initialNavigationAuthenticated: boolean;
  initialUser: PublicShellUser | null;
  initialCategories: { posts: DemoCategory[]; documents: DemoCategory[] };
  linkTargetCatalog: LinkTargetCatalog;
};

type PublicShellUser = {
  displayName: string;
  role: "ADMIN" | "MEMBER";
  photoUrl: string | null;
  profilePhotoFocusX: number;
  profilePhotoFocusY: number;
  profilePhotoZoom: number;
};

export function PublicShellClient({ children, initialSettings, initialNavigation, initialNavigationAuthenticated, initialUser, initialCategories = { posts: [], documents: [] }, linkTargetCatalog }: PublicShellClientProps) {
  seedCategories("posts", initialCategories.posts);
  seedCategories("documents", initialCategories.documents);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const close = () => setMobileOpen(false);
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const toggleButton = toggleRef.current;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLButtonElement>(".public-mobile-close")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const items = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button, summary, [tabindex='0']") ?? []).filter((item) => item.getClientRects().length > 0);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      toggleButton?.focus();
    };
  }, [mobileOpen]);
  const [settings, setSettings] = useState(initialSettings);
  const [signedInUser, setSignedInUser] = useState<PublicShellUser | null>(initialUser);
  useEffect(() => {
    const refresh = () => setSettings(readSiteSettings());
    void refreshSiteSettings().catch(() => undefined);
    window.addEventListener(siteSettingsChangedEvent, refresh);
    return () =>
      window.removeEventListener(siteSettingsChangedEvent, refresh);
  }, []);
  useEffect(() => { void refreshPublicPageSummaries().catch(() => undefined); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Session request failed");
        return response.json() as Promise<{ authenticated: boolean; user: PublicShellUser | null }>;
      })
      .then((result) => setSignedInUser(result?.authenticated ? result.user : null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);
  const logo = displayMediaFor(settings, "logoMediaId");
  const style = {
    "--primary": settings.theme.primary,
    "--secondary": settings.theme.secondary,
    "--accent": settings.theme.accent,
    "--emergency": settings.theme.emergency,
    "--ink": settings.theme.text,
    "--background": settings.theme.background,
    "--foreground": settings.theme.text,
    "--on-primary": foregroundFor(settings.theme.primary),
  } as CSSProperties;
  const logoStyle = logo ? { ...mediaPreviewStyle(logo), ...logoPositionStyle(settings) } : undefined;
  const hasFooterMap = isGoogleMapsUrl(settings.mapUrl);
  const hasFacebook = isSocialUrl(settings.facebookUrl, "facebook");
  const hasYoutube = isSocialUrl(settings.youtubeUrl, "youtube");
  const hasLine = isSocialUrl(settings.lineUrl, "line");
  const isStandaloneAuthPage = pathname === "/login" || pathname === "/change-password";
  if (isStandaloneAuthPage) return <LinkTargetCatalogProvider catalog={linkTargetCatalog}>{children}</LinkTargetCatalogProvider>;
  return (
    <LinkTargetCatalogProvider catalog={linkTargetCatalog}>
    <div className="public-shell" style={style}>
      <Suspense fallback={null}><PublicVisitTracker /></Suspense>
      {mobileOpen ? <button className="public-sidebar-backdrop" aria-label="ปิดเมนู" tabIndex={-1} onClick={() => setMobileOpen(false)} /> : null}
      <aside ref={sidebarRef} id="public-sidebar" role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined} aria-label="เมนูเว็บไซต์" className={`public-sidebar${collapsed && !mobileOpen ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <button type="button" className="public-mobile-close" aria-label="ปิดเมนู" onClick={() => setMobileOpen(false)}><X size={22}/></button>
        <div className="public-sidebar-brand">
          <span
            className={`brand-cross${logo ? " custom-logo" : ""}`}
            style={logoStyle}
          >
            +
          </span>
          <div>
            <strong>{settings.name}</strong>
            {settings.englishName ? <small>{settings.englishName}</small> : null}
          </div>
        </div>
        <div className="public-navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a[href]")) setMobileOpen(false); }}>
          <p>เมนูเว็บไซต์</p>
          <PublicNavigation initialNavigation={initialNavigation} initialAuthenticated={initialNavigationAuthenticated} />
        </div>
      </aside>
      <div inert={mobileOpen} className={`public-main${collapsed ? " sidebar-collapsed" : ""}`}>
        <header className="public-topbar">
          <div className="public-topbar-left">
            <button
              type="button"
              ref={toggleRef}
              className="public-sidebar-toggle"
              aria-label="เปิดหรือย่อเมนูเว็บไซต์"
              aria-controls="public-sidebar"
              title="เปิดหรือย่อเมนูเว็บไซต์"
              onClick={() => { if (window.matchMedia("(max-width: 1024px)").matches) setMobileOpen(true); else setCollapsed((value) => !value); }}
            >
              <Menu className="public-mobile-menu-icon" size={22}/>
              {collapsed ? <PanelLeftOpen className="public-desktop-menu-icon" size={19} strokeWidth={1.8}/> : <PanelLeftClose className="public-desktop-menu-icon" size={19} strokeWidth={1.8}/>}
            </button>
            <Suspense fallback={<PublicBreadcrumbFallback />}>
              <PublicBreadcrumb />
            </Suspense>
          </div>
          <div className="public-topbar-actions">
            <Link className="public-topbar-search" href="/search" aria-label="ค้นหาทั้งเว็บไซต์" title="ค้นหาทั้งเว็บไซต์" aria-current={pathname === "/search" ? "page" : undefined}><Search size={20} aria-hidden="true"/></Link>
            {signedInUser ? <div className="public-topbar-account"><AccountMenu displayName={signedInUser.displayName} variant="public" role={signedInUser.role} photoUrl={signedInUser.photoUrl} photoFocusX={signedInUser.profilePhotoFocusX} photoFocusY={signedInUser.profilePhotoFocusY} photoZoom={signedInUser.profilePhotoZoom}/></div> : <Link className="public-login-button" href={`/login?returnTo=${encodeURIComponent(pathname)}`}><LogIn size={16}/>เข้าสู่ระบบ</Link>}
          </div>
        </header>
        <main>{children}</main>
        <footer id="contact" className="public-footer">
          <div className="public-footer-inner">
            <div className="public-footer-main">
              <div className="public-footer-identity">
                <div className="public-footer-brand">
                  <span className={`public-footer-logo${logo ? " custom-logo" : ""}`} style={logoStyle} aria-hidden="true" />
                  <div><strong>{settings.name}</strong>{settings.englishName ? <small>{settings.englishName}</small> : null}</div>
                </div>
                <PublicVisitTotal />
              </div>
              <section className="public-footer-contact" aria-label="ติดต่อโรงพยาบาล">
                <h2>ติดต่อโรงพยาบาล</h2>
                <p><MapPin size={19}/><span>{settings.address || "ยังไม่ได้ระบุที่อยู่"}</span></p>
                <p><Phone size={19}/>{settings.phone ? <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>{settings.phone}</a> : <span>ยังไม่ได้ระบุเบอร์โทร</span>}</p>
                <p><Mail size={19}/>{settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : <span>ยังไม่ได้ระบุอีเมล</span>}</p>
                {hasFacebook || hasYoutube || hasLine ? <nav className="public-footer-social" aria-label="ช่องทางโซเชียลของโรงพยาบาล">
                  {hasFacebook ? <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook ของโรงพยาบาล"><span className="public-footer-facebook-mark" aria-hidden="true">f</span><span>Facebook</span></a> : null}
                  {hasYoutube ? <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube ของโรงพยาบาล"><Play size={16} fill="currentColor"/><span>YouTube</span></a> : null}
                  {hasLine ? <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" aria-label="LINE OA ของโรงพยาบาล"><MessageCircle size={17}/><span>LINE OA</span></a> : null}
                </nav> : null}
              </section>
              <nav className="public-footer-links" aria-label="ลิงก์ด่วน">
                <h2>ลิงก์ด่วน</h2>
                <Link href="/"><ChevronRight size={16}/>หน้าแรก</Link>
                <Link href="/news"><ChevronRight size={16}/>ข่าวประชาสัมพันธ์</Link>
                <Link href="/documents"><ChevronRight size={16}/>เอกสาร</Link>
                <Link href="/units"><ChevronRight size={16}/>หน่วยงาน</Link>
                {hasFooterMap ? <a className="public-footer-map-link" href={settings.mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={19} strokeWidth={2}/>ดูแผนที่ Google Maps</a> : null}
              </nav>
            </div>
            <div className="public-footer-bottom"><span>© {settings.name}</span><nav aria-label="ข้อมูลและนโยบายเว็บไซต์"><Link href="/privacy-policy">ประกาศความเป็นส่วนตัว</Link><Link href="/cookie-policy">นโยบายคุกกี้</Link></nav></div>
          </div>
        </footer>
      </div>
    </div>
    </LinkTargetCatalogProvider>
  );
}

const publicRouteLabels: Record<string, string> = {
  news: "ข่าวและผลงาน",
  documents: "เอกสาร",
  units: "หน่วยงาน",
  personnel: "บุคลากร",
  contact: "ติดต่อเรา",
  "privacy-policy": "ประกาศความเป็นส่วนตัว",
  "cookie-policy": "นโยบายคุกกี้",
  search: "ค้นหา",
};

function PublicBreadcrumb() {
  const pathname = usePathname();
  const newsSlug = pathname.startsWith("/news/") ? pathname.split("/")[2] : undefined;
  const unitSlug = pathname.startsWith("/units/") ? pathname.split("/")[2] : undefined;
  const [newsTitle, setNewsTitle] = useState<{ slug: string; title: string } | null>(null);
  const [unitTitle, setUnitTitle] = useState<{ slug: string; title: string } | null>(null);
  const [pages, setPages] = useState<ReturnType<typeof readPageSummaries>>([]);
  useEffect(() => {
    if (!newsSlug) return;
    const controller = new AbortController();
    void fetch(`/api/posts/public-title?slug=${encodeURIComponent(newsSlug)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { title: string } : null)
      .then((result) => {
        if (!controller.signal.aborted && result && typeof result.title === "string")
          setNewsTitle({ slug: newsSlug, title: result.title });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [newsSlug]);
  useEffect(() => {
    if (!unitSlug) return;
    const controller = new AbortController();
    void fetch(`/api/units/public-title?slug=${encodeURIComponent(unitSlug)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { title: string } : null)
      .then((result) => {
        if (!controller.signal.aborted && result && typeof result.title === "string")
          setUnitTitle({ slug: unitSlug, title: result.title });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [unitSlug]);
  useEffect(() => {
    const refresh = () => {
      setPages(readPageSummaries());
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(pagesChangeEvent, refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(pagesChangeEvent, refresh);
    };
  }, []);
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  const crumbs: { label: string; href?: string }[] = [
    { label: "หน้าแรก", href: segments.length ? "/" : undefined },
  ];
  if (first) {
    const sectionLabel = publicRouteLabels[first];
    if (sectionLabel) {
      crumbs.push({
        label: sectionLabel,
        href: segments.length > 1 ? `/${first}` : undefined,
      });
      if (segments[1]) {
        const entityLabel =
          first === "news"
            ? newsTitle?.slug === segments[1] ? newsTitle.title : undefined
            : first === "units"
              ? unitTitle?.slug === segments[1] ? unitTitle.title : undefined
              : undefined;
        crumbs.push({
          label:
            entityLabel ?? decodeURIComponent(segments[1]).replaceAll("-", " "),
        });
      }
    } else {
      const pagePath = segments.join("/");
      crumbs.push({
        label:
          pages.find((page) => page.path === pagePath)?.name ?? "หน้าเว็บไซต์",
      });
    }
  }
  return (
    <nav className="public-breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`}>
          {index > 0 ? <i>›</i> : null}
          {crumb.href ? (
            <Link href={crumb.href} title={crumb.label}>
              {crumb.label}
            </Link>
          ) : (
            <b aria-current="page" title={crumb.label}>
              {crumb.label}
            </b>
          )}
        </span>
      ))}
    </nav>
  );
}

function PublicBreadcrumbFallback() {
  return (
    <nav className="public-breadcrumb" aria-label="Breadcrumb"><b>หน้าแรก</b></nav>
  );
}
