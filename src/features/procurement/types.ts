import type { RecordMetadata, Publication, EntityId } from "@/types/content";

export type ProcurementProject = RecordMetadata & {
  projectNumber: string;
  title: string;
  fiscalYear: number;
  method: string;
  /** Integer satang; never floating-point baht. Null means unspecified. */
  budgetSatang: number | null;
  unitId: EntityId | null;
};
export type ProcurementNoticeKind = "plan" | "referencePrice" | "invitation" | "winner" | "contract" | "monthlyReport" | "annualReport";
export type ProcurementNotice = RecordMetadata & {
  projectId: EntityId | null;
  kind: ProcurementNoticeKind;
  title: string;
  slug: string;
  fiscalYear: number;
  /** Required only for monthlyReport; 1–12. */
  reportMonth: number | null;
  announcedOn: string;
  documentIds: EntityId[];
  publication: Publication;
};
