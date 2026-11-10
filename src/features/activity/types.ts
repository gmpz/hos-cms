import type { EntityId, Timestamp } from "@/types/content";

/** Append-only server-generated record. Never accept actor/time from a client. */
export interface AuditEvent {
  readonly id: EntityId;
  readonly actorId: EntityId;
  readonly occurredAt: Timestamp;
  readonly action: "create" | "update" | "publish" | "archive" | "restore";
  readonly entityType: "page" | "post" | "unit" | "document" | "media" | "moitYear" | "moitTopic" | "moitEvidence" | "procurementProject" | "procurementNotice" | "navigation" | "siteSettings";
  readonly entityId: EntityId;
  readonly revision: number;
}
