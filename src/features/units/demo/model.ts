import type { JSONContent } from "@tiptap/react";
import type { LinkTarget } from "@/types/content";
import type { AccessGrants, AccessLevel } from "@/features/access/types";
import { isNavigationIconName, type NavigationIconName } from "@/features/navigation/icon-names";

export type UnitSection =
  "about" | "services" | "personnel" | "posts" | "documents" | "contact";
export type UnitServiceLink = {
  id: string;
  label: string;
  target: LinkTarget;
  openInNewTab: boolean;
};
export type UnitServiceGroup = {
  id: string;
  title: string;
  icon: NavigationIconName | "medical" | "document" | "people" | "knowledge" | "digital";
  accent: "primary" | "secondary" | "accent";
  items: UnitServiceLink[];
};
const legacyUnitServiceIcons = { medical: "heart-pulse", document: "file-text", people: "users", knowledge: "book-open", digital: "globe" } as const;
export function unitServiceIconName(icon: UnitServiceGroup["icon"]): NavigationIconName {
  if (isNavigationIconName(icon)) return icon;
  return legacyUnitServiceIcons[icon];
}
export type PersonnelPhotoFocus = { x: number; y: number; zoom?: number };
export type UnitCoverFocus = { x: number; y: number; zoom?: number };
export type UnitMissionItem = { id: string; title: string; description: string };
export type UnitPersonnel = {
  id: string;
  userId: string | null;
  name: string;
  position: string;
  level?: string;
  expertise: string;
  phone: string;
  phoneExtension: string;
  email: string;
  mediaId: string | null;
  photoFocus: PersonnelPhotoFocus;
};
export type DemoUnit = {
  id: string;
  name: string;
  shortName: string;
  sortOrder: number;
  slug: string;
  summary: string;
  coverMediaId: string | null;
  coverImageUrl: string | null;
  coverFocus: UnitCoverFocus;
  about: JSONContent;
  vision: JSONContent;
  mission: JSONContent;
  visionStatement?: string;
  missionItems?: UnitMissionItem[];
  services: UnitServiceGroup[];
  personnel: UnitPersonnel[];
  contact: {
    phone: string;
    internalPhone: string;
    email: string;
    location: string;
    hours: string;
  };
  sectionOrder: UnitSection[];
  sectionVisibility: Record<UnitSection, boolean>;
  sectionBackground: Record<UnitSection, boolean>;
  status: "draft" | "published";
  accessLevel: AccessLevel;
  accessGrants: AccessGrants;
  updatedAt: string;
  hasUnpublishedChanges?: boolean;
  publishedSlug?: string | null;
  publishedAt?: string | null;
  deletedAt?: string | null;
};

export type UnitChangeGroup = {
  key: "general" | "content" | "services" | "personnel" | "layout" | "contact" | "access";
  title: string;
  details: string[];
};

export const unitSectionLabels: Record<UnitSection, string> = {
  about: "เกี่ยวกับกลุ่มงาน",
  services: "ระบบและบริการ",
  personnel: "บุคลากร",
  posts: "ข่าวและผลงานล่าสุด",
  documents: "เอกสารดาวน์โหลด",
  contact: "ข้อมูลติดต่อ",
};
export const defaultSectionOrder: UnitSection[] = [
  "about",
  "personnel",
  "services",
  "posts",
  "documents",
  "contact",
];
export function unitRichTextContent(text = ""): JSONContent {
  return {
    type: "doc",
    content: [{
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    }],
  };
}
export function createUnit(id: string): DemoUnit {
  return {
    id,
    name: "",
    shortName: "",
    sortOrder: 0,
    slug: "",
    summary: "",
    coverMediaId: null,
    coverImageUrl: null,
    coverFocus: { x: 50, y: 50 },
    about: unitRichTextContent(),
    vision: unitRichTextContent(),
    mission: unitRichTextContent(),
    visionStatement: "",
    missionItems: [],
    services: [],
    personnel: [],
    contact: {
      phone: "",
      internalPhone: "",
      email: "",
      location: "",
      hours: "",
    },
    sectionOrder: [...defaultSectionOrder],
    sectionVisibility: {
      about: true,
      services: true,
      personnel: true,
      posts: true,
      documents: true,
      contact: true,
    },
    sectionBackground: {
      about: false,
      services: true,
      personnel: false,
      posts: true,
      documents: false,
      contact: false,
    },
    status: "draft",
    accessLevel: "PUBLIC",
    accessGrants: { unitIds: [], userIds: [] },
    updatedAt: "เมื่อสักครู่",
  };
}
