"use client";
import { BlockRenderer } from "../blocks/renderers/block-renderer";
import type { DemoPage } from "../demo/model";
import type { PublicDocumentBlockPage } from "@/features/documents/demo/storage";
import type { DemoPost } from "@/features/pages/demo/data";
import type { PublicPostBlockPage } from "@/features/news/public-post-block-page";

export function PublicHome({ page, initialDocumentPages, initialNewsTabPosts, initialPostBlockPages }: { page: DemoPage; initialDocumentPages: Record<string, PublicDocumentBlockPage>; initialNewsTabPosts?: Record<string, DemoPost[]>; initialPostBlockPages?: Record<string, PublicPostBlockPage> }) {
  return (
    <BlockRenderer
      blocks={page.blocks}
      initialDocumentPages={initialDocumentPages}
      initialNewsTabPosts={initialNewsTabPosts}
      initialPostBlockPages={initialPostBlockPages}
    />
  );
}
