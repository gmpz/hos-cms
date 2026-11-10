export type DemoPageStatus = "published" | "draft";
export type DemoPageSummary = { id: string; name: string; path: string; status: DemoPageStatus; blocks: number; updatedAt: string; updatedBy: string; revision: number; locked?: boolean };

