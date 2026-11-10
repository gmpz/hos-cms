export type DemoDocumentStatus = "draft" | "published" | "archived";

export type DemoDocument = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  unitId: string | null;
  owner: string;
  fiscalYear: number;
  documentNumber: string;
  issuedOn: string;
  mediaIds: string[];
  openCount: number;
  downloadCount: number;
  status: DemoDocumentStatus;
  publishedAt: string | null;
  deletedAt?: string | null;
  updatedAt: string;
};

export function currentThaiFiscalYear(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return year + 543 + (month >= 10 ? 1 : 0);
}

export function createDemoDocument(): DemoDocument {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    categoryId: "",
    unitId: null,
    owner: "โรงพยาบาล",
    fiscalYear: currentThaiFiscalYear(),
    documentNumber: "",
    issuedOn: "",
    mediaIds: [],
    openCount: 0,
    downloadCount: 0,
    status: "draft",
    publishedAt: null,
    deletedAt: null,
    updatedAt: "เมื่อสักครู่",
  };
}
