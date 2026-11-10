import { readPageSummaries } from "@/features/pages/demo/page-list-storage";
import { readUnits } from "@/features/units/demo/storage";
import type { LinkTarget } from "@/types/content";
import { moduleRouteCatalog } from "./module-routes";

export type LinkTargetCatalog = {
  pages: Record<string, string>;
  units: Record<string, string>;
};

export function resolveLinkTarget(target: LinkTarget, catalog?: LinkTargetCatalog): string {
  if (target.kind === "external") return target.url;
  if (target.kind === "module") return moduleRouteCatalog[target.module].href;

  switch (target.entity) {
    case "page": {
      if (catalog) {
        const path = catalog.pages[target.id];
        return path ? `/${path}` : `/${encodeURIComponent(target.id)}`;
      }
      const page = readPageSummaries().find((item) => item.id === target.id);
      return page ? `/${page.path}` : `/${encodeURIComponent(target.id)}`;
    }
    case "post":
      return `/news/${encodeURIComponent(target.id)}`;
    case "unit": {
      if (catalog) {
        const slug = catalog.units[target.id];
        return `/units/${encodeURIComponent(slug ?? target.id)}`;
      }
      const unit = readUnits().find((item) => item.id === target.id);
      return `/units/${encodeURIComponent(unit?.slug ?? target.id)}`;
    }
    case "document":
      return `/documents#${encodeURIComponent(target.id)}`;
    case "moitYear":
      return `/moit?year=${encodeURIComponent(target.id)}`;
    case "procurementNotice":
      return `/procurement/${encodeURIComponent(target.id)}`;
  }
}
