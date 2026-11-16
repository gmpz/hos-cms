import type { ArticleBlock } from "../blocks/config/types";

/** Client-facing post shape shared by the news editor and public cards. */
export type DemoPost = {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  unitId: string | null;
  owner: string;
  categoryId: string;
  status: "draft" | "published";
  publishedAt: string | null;
  hasUnpublishedChanges?: boolean;
  /** Admin-only comparison baseline for saved news drafts. */
  publishedBlocks?: ArticleBlock[];
  /** Derived by the server from the publication timestamp; never edited by authors. */
  isNew?: boolean;
  updatedAt: string;
  deletedAt?: string | null;
  coverMediaId: string | null;
  /** Resolved public cover URL for list cards. */
  coverImageUrl?: string | null;
  coverFit: "cover" | "contain";
  coverFocus: { x: number; y: number };
  coverZoom: number;
  showCoverInContent: boolean;
  blocks: ArticleBlock[];
  revision?: number;
  viewCount?: number;
};
