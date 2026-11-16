import type { Attachment, EntityId, LinkTarget } from "@/types/content";
import type { NavigationIconName } from "@/features/navigation/icon-names";
import type { JSONContent } from "@tiptap/react";

export type MediaInteraction =
  | { kind: "none" }
  | { kind: "lightbox" }
  | { kind: "link"; target: LinkTarget; openInNewTab: boolean };

export interface BlockConfigMap {
  hero: {
    title: string;
    description: string;
    imageId: EntityId | null;
    focalPoint: { x: number; y: number };
    imageInteraction: MediaInteraction;
    action: { label: string; target: LinkTarget } | null;
    height: "auto" | "slim" | "thin" | "compact" | "standard" | "tall";
    presentation: "content" | "imageOnly";
    contentPosition:
      | "top-left"
      | "top-center"
      | "top-right"
      | "center-left"
      | "center"
      | "center-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
  };
  bannerSlider: {
    mode: "single" | "slider";
    slides: {
      id: EntityId;
      title: string;
      description: string;
      imageId: EntityId | null;
      focalPoint: { x: number; y: number };
      zoom: number;
      imageInteraction: MediaInteraction;
      action: { label: string; target: LinkTarget } | null;
    }[];
    autoplay: boolean;
    intervalSeconds: 3 | 5 | 7;
    height: "auto" | "slim" | "thin" | "compact" | "standard" | "tall";
    presentation: "content" | "imageOnly";
    contentPosition:
      | "top-left"
      | "top-center"
      | "top-right"
      | "center-left"
      | "center"
      | "center-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
  };
  heading: {
    text: string;
    description: string;
    level: 2 | 3;
    align: "left" | "center";
  };
  text: { content: JSONContent };
  cardText: { title: string; content: JSONContent };
  image: {
    mode: "image" | "imageText";
    title: string;
    description: string;
    titleAlign: "left" | "center" | "right";
    mediaId: EntityId | null;
    alt: string;
    caption: string;
    imageSize: "small" | "medium" | "large" | "full";
    imageAlign: "left" | "center" | "right";
    imageTextDisplay: "natural" | "crop";
    imageTextSplit: "40-60" | "50-50" | "60-40";
    aspectRatio: "original" | "16:9" | "4:3" | "1:1" | "4:5" | "a4";
    fit: "contain" | "cover";
    focalPoint: { x: number; y: number };
    zoom: number;
    imageInteraction: MediaInteraction;
    imagePosition: "left" | "right";
    verticalAlign: "top" | "center" | "bottom";
    action: {
      label: string;
      target: LinkTarget;
      openInNewTab: boolean;
    } | null;
  };
  /** Legacy snapshot shape. Migrated to image v6 when read. */
  imageText: {
    title: string;
    body: string;
    imageId: EntityId | null;
    imagePosition: "left" | "right";
    verticalAlign: "top" | "center" | "bottom";
    action: {
      label: string;
      target: LinkTarget;
      openInNewTab: boolean;
    } | null;
  };
  cta: {
    title: string;
    description: string;
    label: string;
    target: LinkTarget;
    variant: "solid" | "outline";
  };
  gallery: {
    title: string;
    headingSize: "small" | "standard" | "large";
    description: string;
    titleAlign: "left" | "center" | "right";
    layout: "grid" | "slider";
    autoplay: boolean;
    intervalSeconds: 3 | 5 | 7;
    images: { mediaId: EntityId; alt: string }[];
    columns: 2 | 3 | 4;
  };
  downloads: { title: string; headingSize: "small" | "standard" | "large"; files: Attachment[] };
  documentList: {
    title: string;
    headingSize: "small" | "standard" | "large";
    description: string;
    numbering: "automatic" | "manual" | "none";
    numberPrefix: string;
    showIcons: boolean;
    items: {
      id: EntityId;
      level: 1 | 2 | 3;
      number: string;
      label: string;
      source:
        | { kind: "media"; mediaId: EntityId }
        | { kind: "external"; url: string }
        | null;
    }[];
  };
  links: { items: { label: string; target: LinkTarget }[] };
  linkCards: {
    title: string;
    description: string;
    presentation: "list" | "cards";
    columns: 2 | 3 | 4;
    items: {
      id: EntityId;
      title: string;
      description: string;
      visual:
        | {
            kind: "icon";
            icon: NavigationIconName;
          }
        | {
            kind: "image";
            mediaId: EntityId | null;
            focalPoint: { x: number; y: number };
            zoom: number;
          };
      target: LinkTarget;
    }[];
  };
  serviceGroups: {
    title: string;
    description: string;
    columns: 2 | 3;
    groups: {
      id: EntityId;
      title: string;
      icon: NavigationIconName;
      accent: "primary" | "secondary" | "accent";
      items: {
        id: EntityId;
        label: string;
        target: LinkTarget;
        openInNewTab: boolean;
      }[];
    }[];
  };
  faq: { title: string; description: string; items: { question: string; answer: string }[] };
  table: {
    caption: string;
    description: string;
    align:
      | "center"
      | "left-standard"
      | "left-wide"
      | "left-full"
      | "right-standard"
      | "right-wide"
      | "right-full";
    headers: string[];
    rows: string[][];
    columnWidths: number[];
  };
  statistics: {
    title: string;
    description: string;
    columns: 2 | 3 | 4;
    items: {
      id: EntityId;
      value: string;
      label: string;
      description: string;
      icon: NavigationIconName;
    }[];
  };
  personnel: {
    title: string;
    description: string;
    unitId: EntityId | null;
    limit: 2 | 3 | 4 | 6 | 8;
    columns: 2 | 3 | 4;
  };
  processSteps: {
    title: string;
    description: string;
    layout: "horizontal" | "vertical";
    items: { id: EntityId; title: string; description: string }[];
  };
  contactInfo: {
    title: string;
    description: string;
    location: string;
    phone: string;
    internalPhone: string;
    email: string;
    hours: string;
  };
  map: {
    title: string;
    description: string;
    url: string;
    height: "compact" | "standard" | "tall";
  };
  timeline: {
    title: string;
    description: string;
    items: { id: EntityId; date: string; title: string; description: string }[];
  };
  quote: {
    text: string;
    attribution: string;
  };
  alert: {
    title: string;
    body: string;
    tone: "info" | "success" | "warning" | "important";
  };
  video: {
    url: string;
    title: string;
    description: string;
    headingSize: "small" | "standard" | "large";
    caption: string;
    mode: "video" | "videoText";
    videoTextSplit: "40-60" | "50-50" | "60-40";
    videoPosition: "left" | "right";
    verticalAlign: "top" | "center" | "bottom";
  };
  iframe: {
    url: string;
    title: string;
    description: string;
    height: "compact" | "standard" | "tall";
  };
  pdfViewer: {
    mediaId: EntityId | null;
    title: string;
    height: "compact" | "standard" | "tall";
    align: "left" | "center" | "right";
  };
  schedule: {
    dateText: string;
    timeText: string;
    location: string;
    description: string;
  };
  divider: { style: "line" | "space" };
  spacer: { size: "small" | "medium" | "large" };
  posts: {
    title: string;
    description: string;
    source:
      | { kind: "all" }
      | { kind: "hospital" }
      | { kind: "unit"; unitId: EntityId };
    categoryId: EntityId | null;
    limit: number;
    layout: "grid" | "list";
    showViewAll: boolean;
  };
  newsTabs: {
    title: string;
    description: string;
    tabs: {
      id: EntityId;
      label: string;
      source:
        | { kind: "all" }
        | { kind: "hospital" }
        | { kind: "unit"; unitId: EntityId };
      categoryId: EntityId | null;
    }[];
    showImage: boolean;
    showDate: boolean;
    showDescription: boolean;
    showViewAll: boolean;
  };
  documents: {
    title: string;
    description: string;
    layout: "cards" | "table";
    tabs: {
      id: EntityId;
      label: string;
      source:
        | { kind: "all" }
        | { kind: "hospital" }
        | { kind: "unit"; unitId: EntityId }
        | { kind: "selected"; documentIds: EntityId[] };
      categoryId: EntityId | null;
      fiscalYear: "all" | number;
    }[];
    limit: number;
  };
}

export type BlockType = keyof BlockConfigMap;
export type PageBlock = {
  [K in BlockType]: {
    id: EntityId;
    type: K;
    version: K extends "hero"
      ? 3
      : K extends "serviceGroups"
        ? 4
      : K extends "heading"
        ? 2
      : K extends "faq"
        ? 2
      : K extends "iframe"
        ? 2
      : K extends "bannerSlider"
        ? 9
      : K extends "newsTabs"
        ? 5
      : K extends "linkCards"
        ? 4
      : K extends "imageText"
        ? 4
      : K extends "posts"
          ? 4
          : K extends "downloads"
            ? 3
          : K extends "documentList"
            ? 4
            : K extends
                  | "text"
                  | "cardText"
                  | "cta"
              ? 2
              : K extends "video"
                ? 3
              : K extends "pdfViewer"
                ? 3
              : K extends "table"
                ? 5
              : K extends "statistics"
                ? 4
              : K extends "map"
                ? 2
              : K extends "contactInfo"
                ? 2
              : K extends "documents"
                ? 6
              : K extends "image"
                ? 10
              : K extends "gallery"
                ? 6
              : 1;
    visibility: "visible" | "hidden";
    surface: "default" | "muted" | "primary";
    width: "narrow" | "standard" | "wide" | "full";
    position:
      | "center"
      | "left-standard"
      | "left-wide"
      | "left-full"
      | "right-standard"
      | "right-wide"
      | "right-full";
    headingAlign: "left" | "center" | "right";
    /** Semantic size for the block's primary heading. Missing legacy values use standard. */
    headingSize?: "small" | "standard" | "large";
    spacingTop: "none" | "small" | "standard" | "large";
    spacingBottom: "none" | "small" | "standard" | "large";
    headingAccent: "none" | "primary" | "secondary" | "accent";
    config: BlockConfigMap[K];
  };
}[BlockType];

/** Articles share the page format but cannot recursively embed post lists. */
export type ArticleBlock = Exclude<
  PageBlock,
  {
    type:
      | "posts"
      | "newsTabs"
      | "documents"
      | "linkCards"
      | "serviceGroups"
      | "hero"
      | "bannerSlider";
  }
>;
