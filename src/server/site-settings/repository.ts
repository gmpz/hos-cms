import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { defaultTheme, type SiteSettings, type ThemeTokens } from "@/features/site-settings/types";
import { isGoogleMapsUrl } from "@/features/site-settings/map-url";
import { isSocialUrl, type SocialNetwork } from "@/features/site-settings/social-url";
import { prisma } from "@/server/database/prisma";

export class SiteSettingsInputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const themeKeys = ["primary", "secondary", "accent", "emergency", "background", "text"] as const;
const colorPattern = /^#[0-9A-F]{6}$/;

function parseTheme(value: unknown): ThemeTokens {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SiteSettingsInputError("ชุดสีเว็บไซต์ไม่ถูกต้อง");
  const source = value as Record<string, unknown>;
  const theme = Object.fromEntries(themeKeys.map((key) => [key, typeof source[key] === "string" ? source[key].toUpperCase() : ""])) as unknown as ThemeTokens;
  if (themeKeys.some((key) => !colorPattern.test(theme[key]))) throw new SiteSettingsInputError("รหัสสีต้องอยู่ในรูปแบบ #RRGGBB");
  if (contrast(theme.text, theme.background) < 4.5) throw new SiteSettingsInputError("สีข้อความและสีพื้นหลังมีความต่างไม่เพียงพอ กรุณาเลือกสีที่อ่านง่ายขึ้น");
  return theme;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function contrast(left: string, right: string) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

function parseInput(value: unknown): SiteSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SiteSettingsInputError("ข้อมูลเว็บไซต์ไม่ถูกต้อง");
  const input = value as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const result = typeof input[key] === "string" ? input[key].trim() : "";
    if ((required && !result) || result.length > max) throw new SiteSettingsInputError(`ข้อมูล ${key} ไม่ถูกต้อง`);
    return result;
  };
  const revision = input.revision;
  if (!Number.isInteger(revision) || Number(revision) < 1) throw new SiteSettingsInputError("revision ไม่ถูกต้อง");
  const email = text("email", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SiteSettingsInputError("อีเมลไม่ถูกต้อง");
  const mapUrl = text("mapUrl", 2048);
  if (mapUrl && !isGoogleMapsUrl(mapUrl)) throw new SiteSettingsInputError("กรุณาใส่ลิงก์ HTTPS จาก Google Maps ให้ถูกต้อง");
  const socialUrl = (key: "facebookUrl" | "youtubeUrl" | "lineUrl", network: SocialNetwork, label: string) => {
    const url = text(key, 2048);
    if (url && !isSocialUrl(url, network)) throw new SiteSettingsInputError(`กรุณาใส่ลิงก์ HTTPS ของ${label}ให้ถูกต้อง`);
    return url;
  };
  const facebookUrl = socialUrl("facebookUrl", "facebook", "Facebook");
  const youtubeUrl = socialUrl("youtubeUrl", "youtube", "YouTube");
  const lineUrl = socialUrl("lineUrl", "line", "LINE");
  const logoMediaId = typeof input.logoMediaId === "string" && input.logoMediaId ? input.logoMediaId : null;
  const logoFocusX = Number(input.logoFocusX);
  const logoFocusY = Number(input.logoFocusY);
  const logoZoom = Number(input.logoZoom);
  if (!Number.isInteger(logoFocusX) || logoFocusX < 0 || logoFocusX > 100 || !Number.isInteger(logoFocusY) || logoFocusY < 0 || logoFocusY > 100 || !Number.isInteger(logoZoom) || logoZoom < 100 || logoZoom > 300) throw new SiteSettingsInputError("ตำแหน่งหรือขนาดโลโก้ไม่ถูกต้อง");
  const homepageId = typeof input.homepageId === "string" && input.homepageId ? input.homepageId : null;
  return { id: "site", name: text("name", 160, true), englishName: text("englishName", 160), logoMediaId, logoFocusX, logoFocusY, logoZoom, homepageId, address: text("address", 2000), mapUrl, facebookUrl, youtubeUrl, lineUrl, phone: text("phone", 40), email, theme: parseTheme(input.theme), revision: Number(revision) };
}

function toDto(row: { name: string; englishName: string; logoMediaId: string | null; logoFocusX: number; logoFocusY: number; logoZoom: number; homepageId: string | null; address: string; mapUrl: string; facebookUrl: string; youtubeUrl: string; lineUrl: string; phone: string; email: string; theme: Prisma.JsonValue; revision: number }): SiteSettings {
  let theme: ThemeTokens;
  try { theme = parseTheme(row.theme); } catch { theme = defaultTheme; }
  return { id: "site", name: row.name, englishName: row.englishName, logoMediaId: row.logoMediaId, logoFocusX: row.logoFocusX, logoFocusY: row.logoFocusY, logoZoom: row.logoZoom, homepageId: row.homepageId, address: row.address, mapUrl: row.mapUrl, facebookUrl: row.facebookUrl, youtubeUrl: row.youtubeUrl, lineUrl: row.lineUrl, phone: row.phone, email: row.email, theme, revision: row.revision };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) throw new SiteSettingsInputError("ไม่พบการตั้งค่าเว็บไซต์", 500);
  return toDto(row);
}

export async function updateSiteSettings(value: unknown, actorId: string): Promise<SiteSettings> {
  const input = parseInput(value);
  return prisma.$transaction(async (tx) => {
    if (input.logoMediaId && await tx.mediaAsset.count({ where: { id: input.logoMediaId, kind: "IMAGE" } }) !== 1) throw new SiteSettingsInputError("ไม่พบโลโก้ที่เลือก");
    if (input.homepageId && await tx.cmsPage.count({ where: { id: input.homepageId, deletedAt: null } }) !== 1) throw new SiteSettingsInputError("ไม่พบหน้าแรกที่เลือก");
    const updated = await tx.siteSettings.updateMany({ where: { id: 1, revision: input.revision }, data: {
      name: input.name, englishName: input.englishName, logoMediaId: input.logoMediaId, logoFocusX: input.logoFocusX, logoFocusY: input.logoFocusY, logoZoom: input.logoZoom, homepageId: input.homepageId,
      address: input.address, mapUrl: input.mapUrl, facebookUrl: input.facebookUrl, youtubeUrl: input.youtubeUrl, lineUrl: input.lineUrl, phone: input.phone, email: input.email, theme: input.theme as unknown as Prisma.InputJsonObject,
      revision: { increment: 1 },
    } });
    if (updated.count !== 1) throw new SiteSettingsInputError("ข้อมูลถูกแก้ไขจากอีกหน้าต่าง กรุณาโหลดหน้าใหม่", 409);
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "site-settings.update", entityType: "site-settings", entityId: "site", summary: "แก้ไขข้อมูลและธีมเว็บไซต์" } });
    const row = await tx.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
    return toDto(row);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
