"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import type { PublicAnnouncement } from "@/features/announcements/types";
import { PublicAnnouncementGate } from "@/features/announcements/components/public-announcement-gate";

export function PublicAnnouncementEntry({ announcements, themeStyle }: {
  announcements: PublicAnnouncement[];
  themeStyle: CSSProperties;
}) {
  const pathname = usePathname();
  const showAnnouncements = !/^\/(?:admin|welcome|login|change-password|profile)(?:\/|$)/.test(pathname);

  return <div style={{ display: "contents", ...themeStyle }}><PublicAnnouncementGate announcements={announcements} pathname={pathname} showAnnouncements={showAnnouncements} /></div>;
}
