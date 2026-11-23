"use client";
import { BlockRenderer } from "../blocks/renderers/block-renderer";
import type { DemoPage } from "../demo/model";
import type { PublicDocumentBlockPage } from "@/features/documents/demo/storage";
import type { DemoPost } from "@/features/pages/demo/data";
import type { PublicPostBlockPage } from "@/features/news/public-post-block-page";
import { PageHeaderBanner } from "./page-header-banner";

export function PublicContentPage({ page, initialDocumentPages, initialNewsTabPosts, initialPostBlockPages }: { page: DemoPage; initialDocumentPages: Record<string, PublicDocumentBlockPage>; initialNewsTabPosts?: Record<string, DemoPost[]>; initialPostBlockPages?: Record<string, PublicPostBlockPage> }) {
  return (
    <article className="public-content-page">
      <PageHeaderBanner page={page} />
      <BlockRenderer blocks={page.blocks} initialDocumentPages={initialDocumentPages} initialNewsTabPosts={initialNewsTabPosts} initialPostBlockPages={initialPostBlockPages} />
    </article>
  );
}
