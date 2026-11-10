import { defaultTheme, type SiteSettings } from "../types";

export const siteSettingsChangedEvent = "hos-site-settings-change";

export const defaultSiteSettings: SiteSettings = {
  id: "site",
  name: "โรงพยาบาลคลองหลวง",
  englishName: "Klong Luang Hospital",
  logoMediaId: null,
  logoFocusX: 50,
  logoFocusY: 50,
  logoZoom: 100,
  homepageId: "home",
  address: "30 หมู่ 7 ต.คลองหก อ.คลองหลวง จ.ปทุมธานี",
  mapUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  lineUrl: "",
  phone: "02 904 6446",
  email: "contact@klongluanghospital.go.th",
  theme: defaultTheme,
  revision: 1,
};

let cachedSettings = defaultSiteSettings;

export function readSiteSettings(): SiteSettings { return cachedSettings; }

export async function refreshSiteSettings(): Promise<SiteSettings> {
  const response = await fetch("/api/site-settings", { cache: "no-store" });
  const payload: unknown = await response.json();
  if (!response.ok || !isSiteSettings(payload)) throw new Error("โหลดการตั้งค่าเว็บไซต์ไม่สำเร็จ");
  cachedSettings = payload;
  window.dispatchEvent(new Event(siteSettingsChangedEvent));
  return cachedSettings;
}

export async function saveSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  const response = await fetch("/api/site-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
  const payload: unknown = await response.json();
  if (!response.ok || !isSiteSettings(payload)) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "บันทึกการตั้งค่าเว็บไซต์ไม่สำเร็จ";
    throw new Error(message);
  }
  cachedSettings = payload;
  window.dispatchEvent(new Event(siteSettingsChangedEvent));
  return cachedSettings;
}

function isSiteSettings(value: unknown): value is SiteSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return row.id === "site" && typeof row.name === "string" && typeof row.englishName === "string" && typeof row.logoFocusX === "number" && typeof row.logoFocusY === "number" && typeof row.logoZoom === "number" && typeof row.address === "string" && typeof row.mapUrl === "string" && typeof row.facebookUrl === "string" && typeof row.youtubeUrl === "string" && typeof row.lineUrl === "string" && typeof row.phone === "string" && typeof row.email === "string" && typeof row.revision === "number" && typeof row.theme === "object" && row.theme !== null;
}
