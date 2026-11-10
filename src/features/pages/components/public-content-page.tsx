"use client";
import { BlockRenderer } from "../blocks/renderers/block-renderer";
import type { DemoPage } from "../demo/model";
import { PageHeaderBanner } from "./page-header-banner";

export function PublicContentPage({ page }: { page: DemoPage }) {
  return (
    <article className="public-content-page">
      <PageHeaderBanner page={page} />
      <BlockRenderer blocks={page.blocks} loadingPresentation="level-two" />
    </article>
  );
}
