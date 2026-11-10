import type { LinkTarget } from "@/types/content";
import type { Navigation } from "./types";
import { isNavigationIconName } from "./icon-names";
import { isModuleRouteId } from "./module-routes";

const entities = new Set(["page", "post", "unit", "document", "moitYear", "procurementNotice"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function label(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 60;
}

function target(value: unknown): value is LinkTarget {
  if (!record(value)) return false;
  if (value.kind === "module") return typeof value.module === "string" && isModuleRouteId(value.module);
  if (value.kind === "entity") return typeof value.entity === "string" && entities.has(value.entity) && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 191;
  if (value.kind !== "external" || typeof value.url !== "string" || value.url.length > 2048) return false;
  try {
    const url = new URL(value.url);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

function link(value: unknown, ids: Set<string>): boolean {
  if (!record(value) || typeof value.id !== "string" || !value.id || value.id.length > 100 || ids.has(value.id) ||
      !label(value.label) || typeof value.visible !== "boolean" || typeof value.openInNewTab !== "boolean" ||
      (value.hideWhenLoggedOut !== undefined && typeof value.hideWhenLoggedOut !== "boolean") || !target(value.target)) return false;
  ids.add(value.id);
  return true;
}

export function isNavigation(value: unknown): value is Navigation {
  if (!record(value) || !record(value.home) || value.home.label !== "หน้าแรก" || !Array.isArray(value.items) || value.items.length > 100) return false;
  const ids = new Set<string>();
  return value.items.every((item: unknown) => {
    if (!record(item)) return false;
    if (item.kind === "link") return (item.icon === undefined || isNavigationIconName(item.icon)) && link(item, ids);
    if (item.kind !== "dropdown" || typeof item.id !== "string" || !item.id || item.id.length > 100 || ids.has(item.id) ||
        !label(item.label) || (item.icon !== undefined && !isNavigationIconName(item.icon)) || typeof item.visible !== "boolean" ||
        (item.hideWhenLoggedOut !== undefined && typeof item.hideWhenLoggedOut !== "boolean") ||
        (item.defaultExpanded !== undefined && typeof item.defaultExpanded !== "boolean") ||
        !Array.isArray(item.children) || item.children.length > 50) return false;
    ids.add(item.id);
    return item.children.every((child: unknown) => link(child, ids));
  });
}
