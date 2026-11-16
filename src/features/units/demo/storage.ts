import { createId } from "@/utils/create-id";
import { unitRichTextContent, type DemoUnit } from "./model";
let publicUnits: DemoUnit[] = [];
let adminUnits: DemoUnit[] = [];
let deletedUnits: DemoUnit[] = [];
let publicLoaded = false;
let adminLoaded = false;
export function readUnits(includeDrafts = false, includeDeleted = false): DemoUnit[] {
  const units = (includeDeleted ? deletedUnits : includeDrafts ? adminUnits : publicUnits) ?? [];
  return units.map((unit) => ({
      ...unit,
      coverImageUrl: unit.coverImageUrl ?? null,
      coverFocus: unit.coverFocus ?? { x: 50, y: 50 },
      about:
        typeof unit.about === "string"
          ? unitRichTextContent(unit.about)
          : unit.about ?? unitRichTextContent(),
      vision:
        typeof unit.vision === "string"
          ? unitRichTextContent(unit.vision)
          : unit.vision ?? unitRichTextContent(),
      mission:
        typeof unit.mission === "string"
          ? unitRichTextContent(unit.mission)
          : unit.mission ?? unitRichTextContent(),
      sectionBackground: unit.sectionBackground ?? {
        about: false,
        services: true,
        personnel: false,
        posts: true,
        documents: false,
        contact: false,
      },
      services: migrateServices(unit.services ?? []),
      personnel: (unit.personnel ?? []).map((person) => {
        const legacyPerson = person as typeof person & {
          photoPosition?: string;
        };
        return {
          ...person,
          userId: person.userId ?? null,
          photoFocus:
            person.photoFocus ??
            (legacyPerson.photoPosition?.startsWith("bottom")
              ? { x: 50, y: 100 }
              : legacyPerson.photoPosition === "center"
                ? { x: 50, y: 50 }
                : { x: 50, y: 25 }),
        };
      }),
    }));
}

export function seedPublicUnits(units: DemoUnit[]): void {
  if (!Array.isArray(units)) return;
  publicUnits = units;
  publicLoaded = true;
}

export async function refreshUnits(includeDrafts = false, includeDeleted = false): Promise<DemoUnit[]> {
  const response = await fetch(`/api/units${includeDeleted ? "?admin=1&trash=1" : includeDrafts ? "?admin=1" : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดข้อมูลกลุ่มงานไม่สำเร็จ");
  const rows = await response.json() as DemoUnit[];
  if (includeDeleted) deletedUnits = rows;
  else if (includeDrafts) { adminUnits = rows; adminLoaded = true; }
  else { publicUnits = rows; publicLoaded = true; }
  window.dispatchEvent(new Event("hos-units-change"));
  return rows;
}

export async function reorderUnits(ids: string[]): Promise<DemoUnit[]> {
  const response = await fetch("/api/units/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "จัดลำดับหน่วยงานไม่สำเร็จ");
  return refreshUnits(true);
}

export function unitsLoaded(includeDrafts = false): boolean { return includeDrafts ? adminLoaded : publicLoaded; }

function migrateServices(services: unknown[]): DemoUnit["services"] {
  if (services.every((service) => isRecord(service) && Array.isArray(service.items))) {
    return services as DemoUnit["services"];
  }
  const items = services.flatMap((service) => {
    if (!isRecord(service)) return [];
    return [{
      id: typeof service.id === "string" ? service.id : createId(),
      label: typeof service.name === "string" ? service.name : "ลิงก์บริการ",
      target: isRecord(service.target)
        ? service.target as DemoUnit["services"][number]["items"][number]["target"]
        : { kind: "module" as const, module: "services" as const },
      openInNewTab: service.openInNewTab === true,
    }];
  });
  return items.length ? [{
    id: "migrated-service-group",
    title: "ระบบและบริการ",
    icon: "globe",
    accent: "primary",
    items,
  }] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export async function saveUnit(unit: DemoUnit, publish: boolean): Promise<DemoUnit> {
  const response = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit, publish }) });
  const payload = await response.json() as DemoUnit & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "บันทึกกลุ่มงานไม่สำเร็จ");
  await Promise.all([refreshUnits(true), refreshUnits()]);
  return payload;
}

export async function discardUnitDraft(id: string): Promise<DemoUnit> {
  const response = await fetch(`/api/units/${encodeURIComponent(id)}/draft`, { method: "DELETE" });
  const payload = await response.json() as DemoUnit & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "ยกเลิกฉบับร่างไม่สำเร็จ");
  adminUnits = adminUnits.map((unit) => unit.id === id ? payload : unit);
  window.dispatchEvent(new Event("hos-units-change"));
  void refreshUnits(true).catch(() => undefined);
  return payload;
}
