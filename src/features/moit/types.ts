import type { RecordMetadata, Publication, EntityId } from "@/types/content";

export type MoitYear = RecordMetadata & {
  fiscalYear: number;
  title: string;
  publication: Publication;
};
/** Topics and indicators are data per year; never hard-code annual criteria. */
export type MoitTopic = RecordMetadata & {
  yearId: EntityId;
  parentId: EntityId | null;
  code: string;
  title: string;
  description: string;
  sortOrder: number;
  publication: Publication;
};
export type MoitEvidence = RecordMetadata & {
  topicId: EntityId;
  title: string;
  sortOrder: number;
  publication: Publication;
  target: { kind: "document"; documentId: EntityId } | { kind: "external"; url: string };
};
