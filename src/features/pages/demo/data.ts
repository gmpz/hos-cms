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
  /** Admin-only published values used to label form fields with saved draft changes. */
  publishedDetails?: Pick<DemoPost, "title" | "categoryId" | "unitId" | "coverMediaId" | "coverFit" | "coverFocus" | "coverZoom">;
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
  editorMode?: "blocks" | "form";
  formPayload?: unknown;
  revision?: number;
  viewCount?: number;
};
