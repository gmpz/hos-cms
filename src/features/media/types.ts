import type { RecordMetadata, ContentOwner } from "@/types/content";

export type MediaAsset = RecordMetadata & {
  owner: ContentOwner;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  alt: string;
  caption: string;
} & (
  | { kind: "image"; width: number; height: number }
  | { kind: "file"; width: null; height: null }
);
