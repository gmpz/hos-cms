"use client";
import { BlockRenderer } from "../blocks/renderers/block-renderer";
import type { DemoPage } from "../demo/model";

export function PublicHome({ page }: { page: DemoPage }) {
  return (
    <BlockRenderer
      blocks={page.blocks}
      loadingPresentation="level-two"
    />
  );
}
