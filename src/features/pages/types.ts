import type { RecordMetadata, Publication, Seo, ContentOwner } from "@/types/content";
import type { PageBlock } from "./blocks/config/types";

export type Page = RecordMetadata & {
  title: string;
  /** Normalized relative path; empty string is the unique homepage. */
  path: string;
  owner: ContentOwner;
  blocks: PageBlock[];
  publication: Publication;
  seo: Seo;
};
