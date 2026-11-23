export type PublicUnitListItem = {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string | null;
  coverFocus: { x: number; y: number; zoom?: number };
  personnelCount: number;
};

export type PublicUnitListPage = { items: PublicUnitListItem[]; page: number; pageSize: number; total: number };
