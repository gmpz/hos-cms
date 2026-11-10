import type { RecordMetadata, Publication, Seo, EntityId } from "@/types/content";
import type { PageBlock } from "@/features/pages/blocks/config/types";

/** A content grouping, not a tenant or an authorization boundary. */
export type Unit = RecordMetadata & {
  name: string;
  slug: string;
  summary: string;
  coverMediaId: EntityId | null;
  blocks: PageBlock[];
  phone: string;
  email: string;
  location: string;
  sortOrder: number;
  publication: Publication;
  seo: Seo;
};
