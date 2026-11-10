/** ISO 8601 UTC timestamps; date-only values use YYYY-MM-DD. */
export type EntityId = string;
export type Timestamp = string;
export type Publication =
  | { status: "draft"; publishedAt: null }
  | { status: "published"; publishedAt: Timestamp }
  | { status: "archived"; publishedAt: Timestamp | null };

export interface RecordMetadata {
  id: EntityId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: EntityId;
  updatedBy: EntityId;
  revision: number;
}

export interface Seo {
  title: string | null;
  description: string | null;
  imageId: EntityId | null;
}

export type ContentOwner =
  | { kind: "hospital" }
  | { kind: "unit"; unitId: EntityId };

export interface Attachment {
  mediaId: EntityId;
  label: string;
}

export type LinkTarget =
  | { kind: "external"; url: string }
  | { kind: "entity"; entity: "page" | "post" | "unit" | "document" | "moitYear" | "procurementNotice"; id: EntityId }
  | { kind: "module"; module: "home" | "news" | "units" | "documents" | "moit" | "procurement" | "services" | "contact" | "search" };
