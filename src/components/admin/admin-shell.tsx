"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { defaultSiteSettings, readSiteSettings, refreshSiteSettings, siteSettingsChangedEvent } from "@/features/site-settings/demo/storage";
import type { SiteSettings } from "@/features/site-settings/types";
import { AdminSessionGuard } from "@/features/auth/components/admin-session-guard";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { useSidebarCollapse } from "./use-sidebar-collapse";

type AdminShellProps = {
  children: ReactNode;
  displayName: string;
  photoUrl: string | null;
  photoFocusX: number;
  photoFocusY: number;
  photoZoom: number;
  initialSettings?: SiteSettings;
};

export function AdminShell({ children, displayName, photoUrl, photoFocusX, photoFocusY, photoZoom, initialSettings = defaultSiteSettings }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const { collapsed, toggleCollapsed } = useSidebarCollapse();
  useEffect(() => {
    const refresh = () => setSettings(readSiteSettings());
    void refreshSiteSettings().catch(() => undefined);
    window.addEventListener(siteSettingsChangedEvent, refresh);
    return () => window.removeEventListener(siteSettingsChangedEvent, refresh);
  }, []);
  const style = { "--primary": settings.theme.primary, "--secondary": settings.theme.secondary, "--accent": settings.theme.accent, "--ink": settings.theme.text } as CSSProperties;
  return <AdminSessionGuard><div className={`admin-shell${collapsed ? " sidebar-collapsed" : ""}`} style={style}>
    <AdminSidebar open={open} collapsed={collapsed} onClose={() => setOpen(false)}/>
    <div className="admin-workspace">
      <AdminTopbar collapsed={collapsed} onMenu={() => setOpen(true)} onToggle={toggleCollapsed} displayName={displayName} photoUrl={photoUrl} photoFocusX={photoFocusX} photoFocusY={photoFocusY} photoZoom={photoZoom}/>
      <main className="admin-content">{children}</main>
    </div>
  </div></AdminSessionGuard>;
}
