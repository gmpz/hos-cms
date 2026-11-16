"use client";
import { BlockRenderer } from "../blocks/renderers/block-renderer";
import type { DemoPage } from "../demo/model";
import type { PublicDocumentBlockPage } from "@/features/documents/demo/storage";
import type { DemoPost } from "@/features/pages/demo/data";

export function PublicHome({ page, initialDocumentPages, initialNewsTabPosts }: { page: DemoPage; initialDocumentPages: Record<string, PublicDocumentBlockPage>; initialNewsTabPosts?: Record<string, DemoPost[]> }) {
  return (
    <BlockRenderer
      blocks={page.blocks}
      initialDocumentPages={initialDocumentPages}
      initialNewsTabPosts={initialNewsTabPosts}
      loadingPresentation="level-two"
    />
  );
}
