import "server-only";
import type { Unit, UnitAccessGrant } from "@prisma/client";
import type { DemoUnit, UnitChangeGroup } from "@/features/units/demo/model";
import { parseAccessGrants } from "@/server/access/repository";
import { prisma } from "@/server/database/prisma";

type UnitWithGrants = Unit & { landingAccessGrants: UnitAccessGrant[] };
type ChangeKey = UnitChangeGroup["key"];
const titles: Record<ChangeKey, string> = {
  general: "ข้อมูลทั่วไป",
  content: "เนื้อหาหน่วยงาน",
  services: "เมนูบริการแบบกลุ่ม",
  personnel: "บุคลากร",
  layout: "การจัดหน้า",
  contact: "ข้อมูลติดต่อ",
  access: "สิทธิ์เข้าถึง",
};
const accessLabels = { PUBLIC: "สาธารณะ", AUTHENTICATED: "เฉพาะผู้เข้าสู่ระบบ", CUSTOM: "กำหนดผู้มีสิทธิ์" } as const;

function changed(a: unknown, b: unknown): boolean { return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null); }
function text(value: unknown): string { return typeof value === "string" && value.trim() ? value.trim() : "(ว่าง)"; }

export async function getUnitChangeSummary(id: string): Promise<UnitChangeGroup[] | null> {
  const row: UnitWithGrants | null = await prisma.unit.findUnique({ where: { id }, include: { landingAccessGrants: true } });
  if (!row || row.id === "hospital" || !row.publishedPayload || !row.publishedSlug) return null;
  const draft = row.payload as Partial<DemoUnit>;
  const live = row.publishedPayload as Partial<DemoUnit>;
  const groups = new Map<ChangeKey, string[]>();
  const add = (key: ChangeKey, detail: string) => groups.set(key, [...(groups.get(key) ?? []), detail]);

  for (const [field, label] of [["name", "ชื่อกลุ่มงาน"], ["shortName", "ชื่อย่อ"], ["summary", "คำอธิบายสั้น"]] as const)
    if (changed(draft[field], live[field])) add("general", `${label}: ${text(live[field])} → ${text(draft[field])}`);
  if (row.slug !== row.publishedSlug) add("general", `URL: /units/${row.publishedSlug} → /units/${row.slug}`);
  if (changed(draft.coverMediaId, live.coverMediaId)) add("general", "เปลี่ยนภาพหน้าปก");
  else if (changed(draft.coverFocus, live.coverFocus)) add("general", "ปรับตำแหน่งหรือขนาดภาพหน้าปก");

  for (const [field, label] of [["about", "ข้อมูลเกี่ยวกับกลุ่มงาน"], ["vision", "วิสัยทัศน์"], ["mission", "พันธกิจ"]] as const)
    if (changed(draft[field], live[field])) add("content", `แก้ไข${label}`);
  if (changed(draft.visionStatement, live.visionStatement)) add("content", "แก้ไขวิสัยทัศน์");
  if (changed(draft.missionItems, live.missionItems)) add("content", "แก้ไขพันธกิจ");

  const draftGroups = draft.services ?? [];
  const liveGroups = live.services ?? [];
  const liveServiceById = new Map(liveGroups.map((group) => [group.id, group]));
  const draftServiceById = new Map(draftGroups.map((group) => [group.id, group]));
  for (const group of draftGroups) {
    const previous = liveServiceById.get(group.id);
    if (!previous) { add("services", `เพิ่มหมวด “${group.title}”`); continue; }
    if (changed({ title: group.title, icon: group.icon, accent: group.accent }, { title: previous.title, icon: previous.icon, accent: previous.accent })) add("services", `แก้ไขหมวด “${group.title}”`);
    const previousItems = new Map(previous.items.map((item) => [item.id, item]));
    const nextItems = new Map(group.items.map((item) => [item.id, item]));
    for (const item of group.items) {
      const old = previousItems.get(item.id);
      if (!old) add("services", `เพิ่มลิงก์ “${item.label}”`);
      else if (changed(item, old)) add("services", `แก้ไขลิงก์ “${item.label}”`);
    }
    for (const item of previous.items) if (!nextItems.has(item.id)) add("services", `ลบลิงก์ “${item.label}”`);
  }
  for (const group of liveGroups) if (!draftServiceById.has(group.id)) add("services", `ลบหมวด “${group.title}”`);
  if (changed(draftGroups.map((group) => group.id), liveGroups.map((group) => group.id)) && draftGroups.length === liveGroups.length)
    add("services", "เปลี่ยนลำดับหมวดบริการ");
  for (const group of draftGroups) {
    const old = liveServiceById.get(group.id);
    if (old && changed(group.items.map((item) => item.id), old.items.map((item) => item.id)) && group.items.length === old.items.length)
      add("services", `เปลี่ยนลำดับลิงก์ในหมวด “${group.title}”`);
  }

  const oldPeople = new Map((live.personnel ?? []).map((person) => [person.id, person]));
  const nextPeople = new Map((draft.personnel ?? []).map((person) => [person.id, person]));
  for (const person of draft.personnel ?? []) {
    const old = oldPeople.get(person.id);
    if (!old) add("personnel", `เพิ่ม “${person.name}”`);
    else if (changed(person, old)) add("personnel", `แก้ไข “${person.name}”`);
  }
  for (const person of live.personnel ?? []) if (!nextPeople.has(person.id)) add("personnel", `ลบ “${person.name}”`);
  if (changed((draft.personnel ?? []).map((person) => person.id), (live.personnel ?? []).map((person) => person.id)) && draft.personnel?.length === live.personnel?.length)
    add("personnel", "เปลี่ยนลำดับบุคลากร");

  if (changed(draft.sectionOrder, live.sectionOrder)) add("layout", "เปลี่ยนลำดับส่วนแสดงผล");
  if (changed(draft.sectionVisibility, live.sectionVisibility)) add("layout", "เปลี่ยนการเปิด/ปิดส่วนแสดงผล");
  if (changed(draft.sectionBackground, live.sectionBackground)) add("layout", "เปลี่ยนพื้นหลังส่วนแสดงผล");
  for (const [field, label] of [["phone", "โทรศัพท์"], ["internalPhone", "เบอร์ภายใน"], ["email", "อีเมล"], ["location", "ที่ตั้ง"], ["hours", "เวลาทำการ"]] as const)
    if (changed(draft.contact?.[field], live.contact?.[field])) add("contact", `แก้ไข${label}`);

  const previousLevel = row.publishedAccessLevel ?? "PUBLIC";
  if (row.accessLevel !== previousLevel) add("access", `ระดับการเข้าถึง: ${accessLabels[previousLevel]} → ${accessLabels[row.accessLevel]}`);
  const draftGrants = row.accessLevel === "CUSTOM" ? parseAccessGrants(row.draftAccessGrants) : { unitIds: [], userIds: [] };
  const liveGrants = previousLevel === "CUSTOM" ? {
    unitIds: row.landingAccessGrants.flatMap((grant) => grant.unitId ? [grant.unitId] : []),
    userIds: row.landingAccessGrants.flatMap((grant) => grant.userId ? [grant.userId] : []),
  } : { unitIds: [], userIds: [] };
  const unitIds = [...new Set([...draftGrants.unitIds, ...liveGrants.unitIds])];
  const userIds = [...new Set([...draftGrants.userIds, ...liveGrants.userIds])];
  const [units, users] = await Promise.all([
    unitIds.length ? prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, name: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } }) : [],
  ]);
  const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));
  const userNames = new Map(users.map((user) => [user.id, user.displayName]));
  for (const id of draftGrants.unitIds) if (!liveGrants.unitIds.includes(id)) add("access", `เพิ่มหน่วยงาน “${unitNames.get(id) ?? id}”`);
  for (const id of liveGrants.unitIds) if (!draftGrants.unitIds.includes(id)) add("access", `นำหน่วยงาน “${unitNames.get(id) ?? id}” ออก`);
  for (const id of draftGrants.userIds) if (!liveGrants.userIds.includes(id)) add("access", `เพิ่มผู้ใช้ “${userNames.get(id) ?? id}”`);
  for (const id of liveGrants.userIds) if (!draftGrants.userIds.includes(id)) add("access", `นำผู้ใช้ “${userNames.get(id) ?? id}” ออก`);

  return (Object.keys(titles) as ChangeKey[]).flatMap((key) => {
    const details = groups.get(key);
    return details?.length ? [{ key, title: titles[key], details }] : [];
  });
}
