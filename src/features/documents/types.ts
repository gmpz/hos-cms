import type { RecordMetadata, Publication, ContentOwner, EntityId, Attachment } from "@/types/content";

export type Document = RecordMetadata & {
  title: string;
  slug: string;
  documentNumber: string | null;
  description: string;
  categoryId: EntityId;
  owner: ContentOwner;
  /** Buddhist Era fiscal year, e.g. 2569. */
  fiscalYear: number | null;
  issuedOn: string | null;
  files: Attachment[];
  versionLabel: string;
  publication: Publication;
};
export type DocumentCategory = RecordMetadata & { name: string; slug: string; sortOrder: number };
