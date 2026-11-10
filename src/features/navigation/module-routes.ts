import type { LinkTarget } from "@/types/content";

type ModuleId = Extract<LinkTarget, { kind: "module" }>["module"];

// Keep retired destinations resolvable for content already saved in the database.
export const moduleRouteCatalog = {
  home: { label: "หน้าแรก", href: "/", selectable: true },
  news: { label: "ข่าวสาร", href: "/news", selectable: true },
  units: { label: "หน่วยงาน", href: "/units", selectable: true },
  documents: { label: "เอกสาร", href: "/documents", selectable: true },
  contact: { label: "ติดต่อเรา", href: "#contact", selectable: true },
  search: { label: "ค้นหาทั้งเว็บไซต์", href: "/search", selectable: true },
  moit: { label: "MOIT", href: "/moit", selectable: false },
  procurement: { label: "จัดซื้อจัดจ้าง", href: "/procurement", selectable: false },
  services: { label: "บริการประชาชน", href: "/services", selectable: false },
} as const satisfies Record<ModuleId, { label: string; href: string; selectable: boolean }>;

export const selectableModuleRoutes = (Object.keys(moduleRouteCatalog) as ModuleId[])
  .filter((value) => moduleRouteCatalog[value].selectable)
  .map((value) => ({ value, ...moduleRouteCatalog[value] }));

export function isModuleRouteId(value: string): value is ModuleId {
  return Object.prototype.hasOwnProperty.call(moduleRouteCatalog, value);
}
