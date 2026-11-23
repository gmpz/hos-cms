import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { DemoPage } from "@/features/pages/demo/model";

const siteName = "โรงพยาบาลคลองหลวง";
const defaultDescription = "เว็บไซต์ประชาชนและข้อมูลบริการของโรงพยาบาลคลองหลวง";

async function publicOrigin(): Promise<string> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    try { return new URL(configured).origin; } catch { /* Fall back to the request host. */ }
  }
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" || (!host.startsWith("localhost") && !host.startsWith("127.0.0.1")) ? "https" : "http";
  return new URL(`${protocol}://${host}`).origin;
}

export async function publicMetadata({ path, title, description, imageUrl, article = false }: {
  path: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  article?: boolean;
}): Promise<Metadata> {
  const origin = await publicOrigin();
  const url = new URL(path, origin).toString();
  const image = new URL(imageUrl || "/hospital-logo.png", origin).toString();
  const summary = description?.replace(/\s+/g, " ").trim().slice(0, 240) || defaultDescription;
  const fullTitle = title === siteName ? siteName : `${title} | ${siteName}`;
  return {
    title: fullTitle,
    description: summary,
    alternates: { canonical: url },
    openGraph: { type: article ? "article" : "website", locale: "th_TH", siteName, url, title: fullTitle, description: summary, images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title: fullTitle, description: summary, images: [image] },
  };
}

export function pagePreview(page: DemoPage): { title: string; description: string | null; imageId: string | null } {
  const header = page.header.mode === "custom" ? page.header : null;
  const banner = page.blocks.find((block) => block.visibility === "visible" && (block.type === "hero" || block.type === "bannerSlider"));
  const firstSlide = banner?.type === "bannerSlider" ? banner.config.slides[0] : null;
  return {
    title: header?.title.trim() || page.title,
    description: header?.description.trim() || (banner?.type === "hero" ? banner.config.description : firstSlide?.description) || null,
    imageId: header?.imageId || (banner?.type === "hero" ? banner.config.imageId : firstSlide?.imageId) || null,
  };
}

export const privatePageMetadata: Metadata = { robots: { index: false, follow: false }, title: siteName };
