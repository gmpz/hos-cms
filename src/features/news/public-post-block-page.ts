import type { DemoPost } from "@/features/pages/demo/data";

export type PublicPostBlockPage = {
  items: DemoPost[];
  page: number;
  pageSize: number;
  total: number;
};
