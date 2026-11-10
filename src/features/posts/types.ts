import type { RecordMetadata, Publication, Seo, ContentOwner, EntityId, Attachment } from "@/types/content";
import type { ArticleBlock } from "@/features/pages/blocks/config/types";

export type PostKind = "news" | "activity" | "achievement" | "announcement" | "article" | "recruitment";
export type Post = RecordMetadata & {
  title: string;
  slug: string;
  summary: string;
  kind: PostKind;
  owner: ContentOwner;
  categoryIds: EntityId[];
  coverMediaId: EntityId | null;
  blocks: ArticleBlock[];
  attachments: Attachment[];
  showInHospitalFeed: boolean;
  featuredOnHomepage: boolean;
  publication: Publication;
  seo: Seo;
};

export type PostCategory = RecordMetadata & { name: string; slug: string };
