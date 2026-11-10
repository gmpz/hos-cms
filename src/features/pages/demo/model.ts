import type { BlockConfigMap, PageBlock } from "../blocks/config/types";
import { richTextDocumentFromMarkdown } from "../blocks/migrations/rich-text";
import { navigationIconNames } from "@/features/navigation/icon-names";
export type BuilderBlock = Extract<
  PageBlock,
  {
    type:
      | "hero"
      | "bannerSlider"
      | "heading"
      | "text"
      | "cardText"
      | "image"
      | "imageText"
      | "cta"
      | "links"
      | "linkCards"
      | "serviceGroups"
      | "gallery"
      | "quote"
      | "video"
      | "pdfViewer"
      | "downloads"
      | "documentList"
      | "schedule"
      | "faq"
      | "table"
      | "statistics"
      | "personnel"
      | "processSteps"
      | "contactInfo"
      | "map"
      | "timeline"
      | "alert"
      | "divider"
      | "posts"
      | "newsTabs"
      | "documents"
      | "iframe"
      | "spacer";
  }
>;
export type BuilderKind = BuilderBlock["type"];
export const labels: Record<BuilderKind, string> = {
  hero: "แบนเนอร์",
  bannerSlider: "แบนเนอร์",
  heading: "หัวข้อ",
  text: "Rich Text",
  cardText: "การ์ดข้อความ",
  image: "รูปภาพ",
  imageText: "รูปภาพ",
  cta: "ปุ่ม CTA",
  links: "ลิงก์",
  linkCards: "ลิงก์",
  serviceGroups: "เมนูบริการแบบกลุ่ม",
  gallery: "แกลเลอรี",
  quote: "คำพูดเน้น",
  video: "วิดีโอ",
  pdfViewer: "PDF Viewer",
  downloads: "ไฟล์แนบ",
  documentList: "รายการเอกสาร",
  schedule: "วันเวลาและสถานที่",
  faq: "คำถามที่พบบ่อย",
  table: "ตาราง",
  statistics: "สถิติสำคัญ",
  personnel: "บุคลากร",
  processSteps: "ขั้นตอนการรับบริการ",
  contactInfo: "ข้อมูลติดต่อ",
  map: "แผนที่",
  timeline: "Timeline",
  alert: "ประกาศ",
  divider: "เส้นกั้น",
  posts: "ข่าวและผลงาน",
  newsTabs: "ข่าวแบบแท็บ",
  documents: "เอกสาร",
  iframe: "Iframe",
  spacer: "ระยะห่าง",
};
export function createBlock(type: BuilderKind, id: string): BuilderBlock {
  const base = {
    id,
    version: 1 as const,
    visibility: "visible" as const,
    surface: "default" as const,
    width: "standard" as const,
    position: "center" as const,
    headingAlign: "left" as const,
    headingSize: "standard" as const,
    spacingTop: "standard" as const,
    spacingBottom: "standard" as const,
    headingAccent: "none" as const,
  };
  switch (type) {
    case "hero":
      return {
        ...base,
        version: 3,
        type,
        config: {
          title: "เข้าถึงบริการสุขภาพ\nได้ง่ายและมั่นใจ",
          description: "โรงพยาบาลคลองหลวง พร้อมดูแลชุมชนของเรา",
          imageId: null,
          focalPoint: { x: 50, y: 50 },
          imageInteraction: { kind: "none" },
          action: null,
          height: "standard" as const,
          presentation: "content" as const,
          contentPosition: "center-left" as const,
        },
      };
    case "bannerSlider":
      return {
        ...base,
        version: 9,
        type,
        config: {
          mode: "single",
          autoplay: false,
          intervalSeconds: 5,
          height: "standard",
          presentation: "content",
          contentPosition: "center-left",
          slides: [
            {
              id: crypto.randomUUID(),
              title: "บริการสุขภาพที่เข้าถึงง่าย",
              description: "โรงพยาบาลคลองหลวง พร้อมดูแลประชาชนทุกช่วงวัย",
              imageId: null,
              focalPoint: { x: 50, y: 50 },
              zoom: 100,
              imageInteraction: { kind: "none" },
              action: null,
            },
          ],
        },
      };
    case "heading":
      return {
        ...base,
        version: 2,
        type,
        config: {
          text: "หัวข้อส่วนเนื้อหา",
          description: "",
          level: 2,
          align: "left",
        },
      };
    case "text":
      return {
        ...base,
        version: 2,
        type,
        config: {
          content: richTextDocumentFromMarkdown(
            "เพิ่มข้อความแนะนำ บริการ หรือข้อมูลสำคัญที่นี่",
          ),
        },
      };
    case "cardText":
      return {
        ...base,
        version: 2,
        type,
        config: {
          title: "หัวข้อการ์ด",
          content: richTextDocumentFromMarkdown(
            "เพิ่มรายละเอียดหรือข้อมูลสำคัญภายในการ์ด",
          ),
        },
      };
    case "image":
      return {
        ...base,
        version: 10,
        type,
        config: {
          mode: "image",
          title: "",
          description: "",
          titleAlign: "left" as const,
          mediaId: null,
          alt: "",
          caption: "",
          imageSize: "full" as const,
          imageAlign: "center" as const,
          imageTextDisplay: "natural" as const,
          imageTextSplit: "50-50" as const,
          aspectRatio: "original" as const,
          fit: "contain" as const,
          focalPoint: { x: 50, y: 50 },
          zoom: 100,
          imageInteraction: { kind: "none" },
          imagePosition: "left",
          verticalAlign: "center",
          action: null,
        },
      };
    case "imageText":
      return createBlock("image", id);
    case "cta":
      return {
        ...base,
        version: 2,
        type,
        config: {
          title: "ต้องการข้อมูลเพิ่มเติม?",
          description: "เชื่อมโยงผู้เข้าชมไปยังบริการหรือข้อมูลสำคัญ",
          label: "ดูรายละเอียด",
          target: { kind: "module", module: "home" },
          variant: "solid",
        },
      };
    case "links":
      return {
        ...base,
        type,
        config: {
          items: [
            {
              label: "บริการประชาชน",
              target: { kind: "module", module: "services" },
            },
            {
              label: "ติดต่อโรงพยาบาล",
              target: { kind: "module", module: "contact" },
            },
          ],
        },
      };
    case "linkCards":
      return {
        ...base,
        version: 4,
        type,
        config: {
          title: "บริการของเรา",
          description: "เลือกบริการหรือข้อมูลที่ต้องการ",
          presentation: "cards",
          columns: 3,
          items: [
            {
              id: crypto.randomUUID(),
              title: "บริการผู้ป่วยนอก",
              description: "ข้อมูลขั้นตอนและเวลาการให้บริการ",
              visual: { kind: "icon", icon: "stethoscope" },
              target: { kind: "module", module: "services" },
            },
            {
              id: crypto.randomUUID(),
              title: "หน่วยงาน",
              description: "ค้นหาข้อมูลหน่วยงานภายในโรงพยาบาล",
              visual: { kind: "icon", icon: "users" },
              target: { kind: "module", module: "units" },
            },
            {
              id: crypto.randomUUID(),
              title: "เอกสารดาวน์โหลด",
              description: "แบบฟอร์ม คู่มือ และเอกสารเผยแพร่",
              visual: { kind: "icon", icon: "file-text" },
              target: { kind: "module", module: "documents" },
            },
          ],
        } satisfies BlockConfigMap["linkCards"],
      };
    case "serviceGroups":
      return {
        ...base,
        version: 4,
        type,
        config: {
          title: "ท่านต้องการรับบริการในด้านใด?",
          description: "เลือกหมวดบริการที่ต้องการเพื่อเข้าถึงข้อมูลได้อย่างรวดเร็ว",
          columns: 3,
          groups: [
            {
              id: crypto.randomUUID(), title: "บริการประชาชน", icon: "heart-pulse", accent: "primary",
              items: [
                { id: crypto.randomUUID(), label: "บริการออนไลน์", target: { kind: "module", module: "services" }, openInNewTab: false },
                { id: crypto.randomUUID(), label: "ติดต่อโรงพยาบาล", target: { kind: "module", module: "contact" }, openInNewTab: false },
              ],
            },
            {
              id: crypto.randomUUID(), title: "เอกสารและคลังความรู้", icon: "book-open", accent: "secondary",
              items: [
                { id: crypto.randomUUID(), label: "เอกสารเผยแพร่", target: { kind: "module", module: "documents" }, openInNewTab: false },
                { id: crypto.randomUUID(), label: "ข่าวสารและกิจกรรม", target: { kind: "module", module: "news" }, openInNewTab: false },
              ],
            },
            {
              id: crypto.randomUUID(), title: "หน่วยงานและระบบ", icon: "globe", accent: "accent",
              items: [
                { id: crypto.randomUUID(), label: "หน่วยงานภายใน", target: { kind: "module", module: "units" }, openInNewTab: false },
                { id: crypto.randomUUID(), label: "ค้นหาข้อมูล", target: { kind: "module", module: "search" }, openInNewTab: false },
              ],
            },
          ],
        },
      };
    case "gallery":
      return {
        ...base,
        version: 6,
        type,
        config: {
          title: "ประมวลภาพกิจกรรม",
          headingSize: "standard" as const,
          description: "",
          titleAlign: "left" as const,
          layout: "grid" as const,
          autoplay: true,
          intervalSeconds: 5 as const,
          images: [],
          columns: 3 as const,
        },
      };
    case "quote":
      return {
        ...base,
        type,
        config: {
          text: "ข้อความที่ต้องการเน้น",
          attribution: "",
        },
      };
    case "video":
      return {
        ...base,
        version: 3,
        type,
        config: {
          url: "",
          title: "วิดีโอ",
          description: "",
          headingSize: "standard",
          caption: "",
          mode: "video",
          videoTextSplit: "50-50",
          videoPosition: "left",
          verticalAlign: "center",
        },
      };
    case "pdfViewer":
      return {
        ...base,
        version: 3,
        type,
        config: {
          mediaId: null,
          title: "เอกสาร PDF",
          height: "standard",
          align: "center",
        },
      };
    case "downloads":
      return { ...base, version: 3, type, config: { title: "", headingSize: "standard", files: [] } };
    case "documentList":
      return {
        ...base,
        version: 4,
        type,
        config: {
          title: "หัวข้อชุดเอกสาร",
          headingSize: "standard",
          description: "",
          numbering: "automatic",
          numberPrefix: "1",
          showIcons: true,
          items: [],
        },
      };
    case "schedule":
      return {
        ...base,
        type,
        config: { dateText: "", timeText: "", location: "", description: "" },
      };
    case "faq":
      return {
        ...base,
        type,
        config: {
          items: [
            {
              question: "คำถามที่พบบ่อย",
              answer: "เพิ่มคำตอบที่ต้องการเผยแพร่",
            },
          ],
        },
      };
    case "table":
      return {
        ...base,
        version: 5,
        type,
        config: {
          caption: "หัวข้อตาราง",
          description: "",
          align: "center",
          headers: ["หัวข้อที่ 1", "หัวข้อที่ 2", "หัวข้อที่ 3"],
          columnWidths: [],
          rows: [
            ["ข้อมูล 1", "ข้อมูล 2", "ข้อมูล 3"],
            ["ข้อมูล 4", "ข้อมูล 5", "ข้อมูล 6"],
          ],
        },
      };
    case "statistics":
      return {
        ...base,
        version: 4,
        type,
        config: {
          title: "ข้อมูลสำคัญของโรงพยาบาล",
          description: "ภาพรวมการให้บริการและพื้นที่รับผิดชอบ",
          columns: 4,
          items: [
            { id: crypto.randomUUID(), value: "30", label: "เตียง", description: "ขนาดโรงพยาบาล", icon: "hospital" as const },
            { id: crypto.randomUUID(), value: "7", label: "ตำบล", description: "พื้นที่รับผิดชอบ", icon: "map-pin" as const },
            { id: crypto.randomUUID(), value: "200", label: "บุคลากร", description: "ทีมสหวิชาชีพ", icon: "users" as const },
            { id: crypto.randomUUID(), value: "230", label: "คน/วัน", description: "ผู้รับบริการเฉลี่ย", icon: "activity" as const },
          ],
        },
      };
    case "personnel":
      return {
        ...base,
        type,
        config: {
          title: "บุคลากรของเรา",
          description: "ทีมบุคลากรผู้ให้บริการ",
          unitId: null,
          limit: 4,
          columns: 4,
        },
      };
    case "processSteps":
      return {
        ...base,
        type,
        config: {
          title: "ขั้นตอนการรับบริการ",
          description: "เตรียมตัวและรับบริการตามขั้นตอน",
          layout: "horizontal",
          items: [
            { id: crypto.randomUUID(), title: "ลงทะเบียน", description: "ติดต่อจุดลงทะเบียน" },
            { id: crypto.randomUUID(), title: "รอรับบริการ", description: "รอเรียกตามลำดับคิว" },
            { id: crypto.randomUUID(), title: "รับบริการ", description: "เข้ารับบริการตามนัดหมาย" },
          ],
        },
      };
    case "contactInfo":
      return {
        ...base,
        version: 2,
        type,
        config: {
          title: "ข้อมูลติดต่อ",
          description: "ช่องทางติดต่อและเวลาทำการ",
          location: "",
          phone: "",
          internalPhone: "",
          email: "",
          hours: "",
        },
      };
    case "map":
      return {
        ...base,
        version: 2,
        type,
        config: {
          title: "แผนที่",
          description: "ตำแหน่งที่ตั้งและการเดินทาง",
          url: "",
          height: "standard",
        },
      };
    case "timeline":
      return {
        ...base,
        type,
        config: {
          title: "ลำดับเหตุการณ์",
          description: "เหตุการณ์และพัฒนาการที่สำคัญ",
          items: [
            { id: crypto.randomUUID(), date: "2569", title: "เหตุการณ์สำคัญ", description: "เพิ่มรายละเอียดเหตุการณ์" },
          ],
        },
      };
    case "alert":
      return {
        ...base,
        type,
        config: {
          title: "ประกาศ",
          body: "เพิ่มรายละเอียดที่ต้องการแจ้งให้ผู้เข้าชมทราบ",
          tone: "info",
        },
      };
    case "posts":
      return {
        ...base,
        version: 4,
        type,
        config: {
          title: "ข่าวและผลงาน",
          description: "ติดตามข่าวสารและผลงานล่าสุดของโรงพยาบาล",
          source: { kind: "all" as const },
          categoryId: null,
          limit: 3,
          layout: "grid" as const,
          showViewAll: true,
        },
      };
    case "newsTabs":
      return {
        ...base,
        version: 5,
        type,
        config: {
          title: "ข่าวสารและกิจกรรม",
          description: "ติดตามข่าวประชาสัมพันธ์และกิจกรรมล่าสุดของโรงพยาบาล",
          tabs: [
            { id: `${id}-all`, label: "ข่าวทั้งหมด", source: { kind: "all" as const }, categoryId: null },
          ],
          showImage: true,
          showDate: true,
          showDescription: true,
          showViewAll: true,
        },
      };
    case "documents":
      return {
        ...base,
        version: 5,
        type,
        config: {
          title: "เอกสารเผยแพร่",
          description: "ดาวน์โหลดแบบฟอร์ม คู่มือ และเอกสารสำคัญ",
          layout: "cards",
          tabs: [
            {
              id: `${id}-all`,
              label: "เอกสารทั้งหมด",
              source: { kind: "all" },
              categoryId: null,
            },
          ],
          limit: 6,
        },
      };
    case "iframe":
      return {
        ...base,
        version: 2,
        type,
        config: {
          url: "https://",
          title: "เนื้อหาจากเว็บไซต์ภายนอก",
          description: "",
          height: "standard",
        },
      };
    case "divider":
      return { ...base, type, config: { style: "line" } };
    case "spacer":
      return { ...base, type, config: { size: "medium" } };
  }
}
export interface DemoPage {
  id: string;
  title: string;
  header: PageHeaderSettings;
  blocks: BuilderBlock[];
}
export interface PageHeaderSettings {
  mode: "system" | "custom" | "hidden";
  eyebrow: string;
  title: string;
  description: string;
  imageId: string | null;
  focalPoint: { x: number; y: number };
}
export const hiddenPageHeader: PageHeaderSettings = {
  mode: "hidden",
  eyebrow: "หน้าเว็บไซต์",
  title: "",
  description: "",
  imageId: null,
  focalPoint: { x: 50, y: 50 },
};
export const initialPage: DemoPage = {
  id: "home",
  title: "หน้าแรก",
  header: hiddenPageHeader,
  blocks: [
    createBlock("bannerSlider", "home-hero"),
    createBlock("text", "home-intro"),
    createBlock("posts", "home-posts"),
    createBlock("documents", "home-documents"),
  ],
};
export function createInitialPage(id: string, title: string): DemoPage {
  if (id === "home") return initialPage;
  return {
    id,
    title,
    header: {
      mode: "system",
      eyebrow: "หน้าเว็บไซต์",
      title,
      description: "",
      imageId: null,
      focalPoint: { x: 50, y: 50 },
    },
    blocks: [createBlock("text", `${id}-content`)],
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validMediaInteraction(value: unknown) {
  if (!record(value)) return false;
  if (value.kind === "none" || value.kind === "lightbox") return true;
  return (
    value.kind === "link" &&
    typeof value.openInNewTab === "boolean" &&
    record(value.target) &&
    ["external", "entity", "module"].includes(String(value.target.kind))
  );
}
export function isDemoPage(value: unknown): value is DemoPage {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.title !== "string" ||
    !record(value.header) ||
    !["system", "custom", "hidden"].includes(String(value.header.mode)) ||
    typeof value.header.eyebrow !== "string" ||
    value.header.eyebrow.length > 100 ||
    typeof value.header.title !== "string" ||
    value.header.title.length > 300 ||
    typeof value.header.description !== "string" ||
    value.header.description.length > 500 ||
    !(value.header.imageId === null || typeof value.header.imageId === "string") ||
    !record(value.header.focalPoint) ||
    typeof value.header.focalPoint.x !== "number" ||
    typeof value.header.focalPoint.y !== "number" ||
    value.header.focalPoint.x < 0 || value.header.focalPoint.x > 100 ||
    value.header.focalPoint.y < 0 || value.header.focalPoint.y > 100 ||
    !Array.isArray(value.blocks) ||
    value.blocks.length > 50
  )
    return false;
  const ids = new Set<string>();
  return value.blocks.every((b: unknown) => {
    if (
      !record(b) ||
      typeof b.id !== "string" ||
      !b.id ||
      ids.has(b.id) ||
      !["visible", "hidden"].includes(String(b.visibility)) ||
      !["default", "muted", "primary"].includes(String(b.surface)) ||
      !["narrow", "standard", "wide", "full"].includes(String(b.width)) ||
      ![
        "center", "left-standard", "left-wide", "left-full",
        "right-standard", "right-wide", "right-full",
      ].includes(String(b.position)) ||
      !["left", "center", "right"].includes(String(b.headingAlign)) ||
      !(b.headingSize === undefined || ["small", "standard", "large"].includes(String(b.headingSize))) ||
      !["none", "small", "standard", "large"].includes(String(b.spacingTop)) ||
      !["none", "small", "standard", "large"].includes(String(b.spacingBottom)) ||
      !record(b.config)
    )
      return false;
    ids.add(b.id);
    const c = b.config;
    switch (b.type) {
      case "hero":
        return (
          b.version === 4 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          (c.imageId === null || typeof c.imageId === "string") &&
          record(c.focalPoint) &&
          typeof c.focalPoint.x === "number" &&
          typeof c.focalPoint.y === "number" &&
          validMediaInteraction(c.imageInteraction) &&
          c.action === null &&
          ["auto", "slim", "thin", "compact", "standard", "tall"].includes(
            String(c.height),
          ) &&
          ["content", "imageOnly"].includes(String(c.presentation)) &&
          [
            "top-left",
            "top-center",
            "top-right",
            "center-left",
            "center",
            "center-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ].includes(String(c.contentPosition))
        );
      case "bannerSlider":
        return (
          b.version === 9 &&
          ["single", "slider"].includes(String(c.mode)) &&
          ["auto", "slim", "thin", "compact", "standard", "tall"].includes(
            String(c.height),
          ) &&
          ["content", "imageOnly"].includes(String(c.presentation)) &&
          [
            "top-left",
            "top-center",
            "top-right",
            "center-left",
            "center",
            "center-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ].includes(String(c.contentPosition)) &&
          typeof c.autoplay === "boolean" &&
          [3, 5, 7].includes(Number(c.intervalSeconds)) &&
          Array.isArray(c.slides) &&
          c.slides.length >= 1 &&
          c.slides.length <= 8 &&
          c.slides.every(
            (slide) =>
              record(slide) &&
              typeof slide.id === "string" &&
              typeof slide.title === "string" &&
              typeof slide.description === "string" &&
              (slide.imageId === null || typeof slide.imageId === "string") &&
              record(slide.focalPoint) &&
              typeof slide.focalPoint.x === "number" &&
              typeof slide.focalPoint.y === "number" &&
              typeof slide.zoom === "number" &&
              slide.zoom >= 100 &&
              slide.zoom <= 300 &&
              validMediaInteraction(slide.imageInteraction) &&
              slide.action === null,
          )
        );
      case "heading":
        return (
          b.version === 2 &&
          typeof c.text === "string" &&
          typeof c.description === "string" &&
          [2, 3].includes(Number(c.level)) &&
          ["left", "center"].includes(String(c.align))
        );
      case "text":
        return (
          b.version === 2 &&
          record(c.content) &&
          c.content.type === "doc" &&
          Array.isArray(c.content.content)
        );
      case "cardText":
        return (
          b.version === 2 &&
          typeof c.title === "string" &&
          record(c.content) &&
          c.content.type === "doc" &&
          Array.isArray(c.content.content)
        );
      case "image":
        return (
          b.version === 10 &&
          ["image", "imageText"].includes(String(c.mode)) &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          ["left", "center", "right"].includes(String(c.titleAlign)) &&
          (c.mediaId === null || typeof c.mediaId === "string") &&
          typeof c.alt === "string" &&
          typeof c.caption === "string" &&
          ["small", "medium", "large", "full"].includes(String(c.imageSize)) &&
          ["left", "center", "right"].includes(String(c.imageAlign)) &&
          ["natural", "crop"].includes(String(c.imageTextDisplay)) &&
          ["40-60", "50-50", "60-40"].includes(String(c.imageTextSplit)) &&
          ["original", "16:9", "4:3", "1:1", "4:5", "a4"].includes(
            String(c.aspectRatio),
          ) &&
          ["contain", "cover"].includes(String(c.fit)) &&
          record(c.focalPoint) &&
          typeof c.focalPoint.x === "number" &&
          typeof c.focalPoint.y === "number" &&
          typeof c.zoom === "number" &&
          c.zoom >= 100 &&
          c.zoom <= 300 &&
          validMediaInteraction(c.imageInteraction) &&
          ["left", "right"].includes(String(c.imagePosition)) &&
          ["top", "center", "bottom"].includes(String(c.verticalAlign)) &&
          (c.action === null ||
            (record(c.action) &&
              typeof c.action.label === "string" &&
              typeof c.action.openInNewTab === "boolean" &&
              record(c.action.target) &&
              ["external", "entity", "module"].includes(
                String(c.action.target.kind),
              )))
        );
      case "cta":
        return (
          b.version === 2 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          typeof c.label === "string" &&
          record(c.target) &&
          ["external", "entity", "module"].includes(String(c.target.kind)) &&
          ["solid", "outline"].includes(String(c.variant))
        );
      case "links":
        return (
          b.version === 1 && Array.isArray(c.items) && c.items.length <= 12
        );
      case "linkCards":
        return (
          b.version === 4 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          ["list", "cards"].includes(String(c.presentation)) &&
          [2, 3, 4].includes(Number(c.columns)) &&
          Array.isArray(c.items) &&
          c.items.length >= 1 &&
          c.items.length <= 12 &&
          c.items.every(
            (item) =>
              record(item) &&
              typeof item.id === "string" &&
              typeof item.title === "string" &&
              typeof item.description === "string" &&
              record(item.visual) &&
              (item.visual.kind === "icon" || item.visual.kind === "image") &&
              (item.visual.kind !== "icon" || navigationIconNames.includes(item.visual.icon as (typeof navigationIconNames)[number])) &&
              (item.visual.kind !== "image" ||
                (record(item.visual.focalPoint) &&
                  typeof item.visual.focalPoint.x === "number" &&
                  typeof item.visual.focalPoint.y === "number" &&
                  item.visual.focalPoint.x >= 0 &&
                  item.visual.focalPoint.x <= 100 &&
                  item.visual.focalPoint.y >= 0 &&
                  item.visual.focalPoint.y <= 100 &&
                  typeof item.visual.zoom === "number" &&
                  item.visual.zoom >= 100 &&
                  item.visual.zoom <= 300)) &&
              record(item.target) &&
              ["external", "entity", "module"].includes(
                String(item.target.kind),
              ),
          )
        );
      case "serviceGroups":
        return (
          b.version === 4 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          [2, 3].includes(Number(c.columns)) &&
          Array.isArray(c.groups) &&
          c.groups.length >= 1 && c.groups.length <= 6 &&
          c.groups.every((group) => record(group) && typeof group.id === "string" && typeof group.title === "string" &&
            navigationIconNames.includes(group.icon as (typeof navigationIconNames)[number]) &&
            ["primary", "secondary", "accent"].includes(String(group.accent)) &&
            Array.isArray(group.items) && group.items.length <= 8 && group.items.every((item) => record(item) && typeof item.id === "string" && typeof item.label === "string" && typeof item.openInNewTab === "boolean" && record(item.target) && ["external", "entity", "module"].includes(String(item.target.kind))))
        );
      case "gallery":
        return (
          b.version === 6 &&
          typeof c.title === "string" &&
          ["small", "standard", "large"].includes(String(c.headingSize)) &&
          typeof c.description === "string" &&
          ["left", "center", "right"].includes(String(c.titleAlign)) &&
          ["grid", "slider"].includes(String(c.layout)) &&
          typeof c.autoplay === "boolean" &&
          [3, 5, 7].includes(Number(c.intervalSeconds)) &&
          Array.isArray(c.images) &&
          c.images.length <= 12 &&
          [2, 3, 4].includes(Number(c.columns))
        );
      case "downloads":
        return (
          b.version === 3 &&
          typeof c.title === "string" && c.title.length <= 160 &&
          ["small", "standard", "large"].includes(String(c.headingSize)) &&
          Array.isArray(c.files) && c.files.length <= 30 &&
          c.files.every((file) => record(file) && typeof file.mediaId === "string" && typeof file.label === "string")
        );
      case "documentList":
        return (
          b.version === 4 &&
          typeof c.title === "string" &&
          ["small", "standard", "large"].includes(String(c.headingSize)) &&
          typeof c.description === "string" &&
          ["automatic", "manual", "none"].includes(String(c.numbering)) &&
          typeof c.numberPrefix === "string" &&
          typeof c.showIcons === "boolean" &&
          Array.isArray(c.items) &&
          c.items.length <= 30 &&
          c.items.every(
            (item) =>
              record(item) &&
              typeof item.id === "string" &&
              [1, 2, 3].includes(Number(item.level)) &&
              typeof item.number === "string" &&
              typeof item.label === "string" &&
              (item.source === null ||
                (record(item.source) &&
                  ((item.source.kind === "media" &&
                    typeof item.source.mediaId === "string") ||
                    (item.source.kind === "external" &&
                      typeof item.source.url === "string")))),
          )
        );
      case "faq":
        return (
          b.version === 1 &&
          Array.isArray(c.items) &&
          c.items.length <= 12 &&
          c.items.every(
            (item) =>
              record(item) &&
              typeof item.question === "string" &&
              typeof item.answer === "string",
          )
        );
      case "table":
        return (
          b.version === 5 &&
          typeof c.caption === "string" &&
          typeof c.description === "string" &&
          [
            "center",
            "left-standard",
            "left-wide",
            "left-full",
            "right-standard",
            "right-wide",
            "right-full",
          ].includes(String(c.align)) &&
          Array.isArray(c.headers) &&
          c.headers.length >= 1 &&
          c.headers.length <= 8 &&
          c.headers.every((header) => typeof header === "string") &&
          Array.isArray(c.columnWidths) &&
          (c.columnWidths.length === 0 || c.columnWidths.length === c.headers.length) &&
          c.columnWidths.every((width) => Number.isInteger(width) && width >= 80 && width <= 2000) &&
          Array.isArray(c.rows) &&
          c.rows.length <= 30 &&
          c.rows.every(
            (row) =>
              Array.isArray(row) &&
              row.length === (c.headers as unknown[]).length &&
              row.every((cell) => typeof cell === "string"),
          )
        );
      case "statistics":
        return (
          b.version === 4 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          [2, 3, 4].includes(Number(c.columns)) &&
          Array.isArray(c.items) &&
          c.items.length >= 1 &&
          c.items.length <= 12 &&
          c.items.every(
            (item) =>
              record(item) &&
              typeof item.id === "string" &&
              typeof item.value === "string" &&
              typeof item.label === "string" &&
              typeof item.description === "string" &&
              navigationIconNames.includes(item.icon as (typeof navigationIconNames)[number]),
          )
        );
      case "personnel":
        return (
          b.version === 1 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          (c.unitId === null || typeof c.unitId === "string") &&
          [2, 3, 4, 6, 8].includes(Number(c.limit)) &&
          [2, 3, 4].includes(Number(c.columns))
        );
      case "processSteps":
        return (
          b.version === 1 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          ["horizontal", "vertical"].includes(String(c.layout)) &&
          Array.isArray(c.items) && c.items.length >= 1 && c.items.length <= 12 &&
          c.items.every((item) => record(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.description === "string")
        );
      case "contactInfo":
        return (
          b.version === 2 &&
          typeof c.title === "string" && typeof c.description === "string" &&
          typeof c.location === "string" && typeof c.phone === "string" &&
          typeof c.internalPhone === "string" &&
          typeof c.email === "string" && typeof c.hours === "string"
        );
      case "map":
        return (
          b.version === 2 && typeof c.title === "string" &&
          typeof c.description === "string" && typeof c.url === "string" &&
          ["compact", "standard", "tall"].includes(String(c.height))
        );
      case "timeline":
        return (
          b.version === 1 && typeof c.title === "string" &&
          typeof c.description === "string" && Array.isArray(c.items) &&
          c.items.length >= 1 && c.items.length <= 20 &&
          c.items.every((item) => record(item) && typeof item.id === "string" && typeof item.date === "string" && typeof item.title === "string" && typeof item.description === "string")
        );
      case "quote":
        return (
          b.version === 1 &&
          typeof c.text === "string" &&
          typeof c.attribution === "string"
        );
      case "alert":
        return (
          b.version === 1 &&
          typeof c.title === "string" &&
          typeof c.body === "string" &&
          ["info", "success", "warning", "important"].includes(String(c.tone))
        );
      case "video":
        return (
          b.version === 3 && typeof c.url === "string" &&
          typeof c.title === "string" && c.title.length <= 160 &&
          typeof c.description === "string" &&
          ["small", "standard", "large"].includes(String(c.headingSize)) &&
          typeof c.caption === "string" &&
          ["video", "videoText"].includes(String(c.mode)) &&
          ["40-60", "50-50", "60-40"].includes(String(c.videoTextSplit)) &&
          ["left", "right"].includes(String(c.videoPosition)) &&
          ["top", "center", "bottom"].includes(String(c.verticalAlign))
        );
      case "pdfViewer":
        return (
          b.version === 3 &&
          (c.mediaId === null || typeof c.mediaId === "string") &&
          typeof c.title === "string" &&
          ["compact", "standard", "tall"].includes(String(c.height)) &&
          ["left", "center", "right"].includes(String(c.align))
        );
      case "posts":
        return (
          b.version === 4 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          record(c.source) &&
          (c.source.kind === "all" ||
            c.source.kind === "hospital" ||
            (c.source.kind === "unit" &&
              typeof c.source.unitId === "string")) &&
          (c.categoryId === null || typeof c.categoryId === "string") &&
          Number.isInteger(c.limit) &&
          Number(c.limit) >= 1 &&
          Number(c.limit) <= 12 &&
          (c.layout === "grid" || c.layout === "list") &&
          typeof c.showViewAll === "boolean"
        );
      case "newsTabs":
        return (
          b.version === 5 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          Array.isArray(c.tabs) &&
          c.tabs.length >= 1 &&
          c.tabs.length <= 6 &&
          c.tabs.every(
            (tab) =>
              record(tab) &&
              typeof tab.id === "string" &&
              typeof tab.label === "string" &&
              record(tab.source) &&
              (tab.source.kind === "all" || tab.source.kind === "hospital" || (tab.source.kind === "unit" && typeof tab.source.unitId === "string")) &&
              (tab.categoryId === null || typeof tab.categoryId === "string"),
          ) &&
          typeof c.showImage === "boolean" &&
          typeof c.showDate === "boolean" &&
          typeof c.showDescription === "boolean" &&
          typeof c.showViewAll === "boolean"
        );
      case "documents":
        return (
          b.version === 5 &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          ["cards", "table"].includes(String(c.layout)) &&
          Array.isArray(c.tabs) &&
          c.tabs.length >= 1 &&
          c.tabs.length <= 6 &&
          c.tabs.every(
            (tab) =>
              record(tab) &&
              typeof tab.id === "string" &&
              typeof tab.label === "string" &&
              record(tab.source) &&
              (tab.source.kind === "all" ||
                tab.source.kind === "hospital" ||
                (tab.source.kind === "unit" &&
                  typeof tab.source.unitId === "string") ||
                (tab.source.kind === "selected" &&
                  Array.isArray(tab.source.documentIds) &&
                  tab.source.documentIds.length <= 30 &&
                  tab.source.documentIds.every((id) => typeof id === "string"))) &&
              (tab.categoryId === null || typeof tab.categoryId === "string"),
          ) &&
          Number.isInteger(c.limit) &&
          Number(c.limit) >= 1 &&
          Number(c.limit) <= 12
        );
      case "spacer":
        return (
          b.version === 1 &&
          ["small", "medium", "large"].includes(String(c.size))
        );
      case "divider":
        return b.version === 1 && ["line", "space"].includes(String(c.style));
      case "iframe":
        return (
          b.version === 2 &&
          typeof c.url === "string" &&
          typeof c.title === "string" &&
          typeof c.description === "string" &&
          ["compact", "standard", "tall"].includes(String(c.height))
        );
      default:
        return false;
    }
  });
}
