import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { connection } from "next/server";
import { PostStatus, Prisma, type Post } from "@prisma/client";
import type { ArticleBlock, BlockConfigMap } from "@/features/pages/blocks/config/types";
import { migrateDownloadsBlocks } from "@/features/pages/blocks/migrations/downloads";
import { migrateDocumentListBlocks } from "@/features/pages/blocks/migrations/document-list";
import { migrateGalleryBlocks } from "@/features/pages/blocks/migrations/gallery";
import { migratePdfViewerBlocks } from "@/features/pages/blocks/migrations/pdf-viewer";
import { migrateVideoBlocks } from "@/features/pages/blocks/migrations/video";
import { migrateImageBlocks } from "@/features/pages/blocks/migrations/image";
import { migrateTableBlocks } from "@/features/pages/blocks/migrations/table";
import { migrateHeadingBlocks } from "@/features/pages/blocks/migrations/heading";
import type { DemoPost } from "@/features/pages/demo/data";
import { prisma } from "@/server/database/prisma";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { formBlocks, formExcerpt, type NewsFormPayload } from "@/features/news/form/template";
import type { PublicPostBlockPage } from "@/features/news/public-post-block-page";

const articleTypes = new Set([
  "heading", "text", "cardText", "image", "cta", "gallery",
  "quote", "alert", "video", "pdfViewer", "downloads", "documentList",
  "schedule", "table", "processSteps", "map", "timeline", "divider",
]);

function newPostSlug(): string {
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date());
  return `news-${year}-${randomBytes(5).toString("hex")}`;
}

export class PostInputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string, maxLength: number, required = false): string {
  if (typeof value !== "string") throw new PostInputError(`${label}ไม่ถูกต้อง`);
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) throw new PostInputError(`${label}ต้องมี 1–${maxLength} ตัวอักษร`);
  return result;
}

function articleBlocks(value: unknown): ArticleBlock[] {
  if (!Array.isArray(value) || value.length > 100 || JSON.stringify(value).length > 500_000)
    throw new PostInputError("จำนวนหรือขนาด Block ไม่ถูกต้อง");
  const ids = new Set<string>();
  for (const block of value) {
    if (!isRecord(block) || typeof block.id !== "string" || !block.id || ids.has(block.id) ||
      typeof block.type !== "string" || !articleTypes.has(block.type) ||
      typeof block.version !== "number" || !Number.isInteger(block.version) || block.version < 1 ||
      !isRecord(block.config) || !["visible", "hidden"].includes(String(block.visibility)) ||
      !["default", "muted", "primary"].includes(String(block.surface)) ||
      !["narrow", "standard", "wide", "full"].includes(String(block.width)))
      throw new PostInputError("ข้อมูล Block ไม่ถูกต้อง");
    ids.add(block.id);
  }
  return value as ArticleBlock[];
}

function formPayload(value: unknown): NewsFormPayload {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.content) ||
    !Array.isArray(value.images) || !Array.isArray(value.files) ||
    typeof value.videoUrl !== "string" ||
    !(value.pdfMediaId === null || typeof value.pdfMediaId === "string") ||
    JSON.stringify(value).length > 100_000 || value.images.length > 20 || value.files.length > 20)
    throw new PostInputError("ข้อมูลแบบฟอร์มข่าวไม่ถูกต้อง");
  const validNode = (node: unknown, depth = 0): boolean => {
    if (!isRecord(node) || depth > 12 || typeof node.type !== "string") return false;
    if (!new Set(["doc", "paragraph", "bulletList", "orderedList", "listItem", "text", "hardBreak", "image"]).has(node.type)) return false;
    if (node.type === "text" && (typeof node.text !== "string" || node.text.length > 10000)) return false;
    if (node.type === "image" && (!isRecord(node.attrs) || typeof node.attrs.src !== "string" || node.attrs.src.length > 2048 ||
      !(/^(\/uploads\/|https:\/\/)/i.test(node.attrs.src)) ||
      (node.attrs.alt !== undefined && (typeof node.attrs.alt !== "string" || node.attrs.alt.length > 300)))) return false;
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) return false;
      for (const mark of node.marks) {
        if (!isRecord(mark)) return false;
        if (mark.type === "bold") continue;
        if (mark.type !== "link" || !isRecord(mark.attrs) || typeof mark.attrs.href !== "string" ||
          !(/^(https?:\/\/|mailto:|tel:|\/)(?!\/)/i.test(mark.attrs.href) || /^#media:[\w-]{1,191}$/.test(mark.attrs.href))) return false;
      }
    }
    return node.content === undefined || (Array.isArray(node.content) && node.content.every((child) => validNode(child, depth + 1)));
  };
  if (value.content.type !== "doc" || !validNode(value.content) || !formExcerpt(value.content as NewsFormPayload["content"]))
    throw new PostInputError("กรุณากรอกเนื้อหาข่าว");
  const validMedia = (item: unknown, key: "alt" | "label") => isRecord(item) && typeof item.mediaId === "string" && item.mediaId.length > 0 && item.mediaId.length <= 191 && typeof item[key] === "string" && item[key].length <= 300;
  if (!value.images.every((item) => validMedia(item, "alt")) || !value.files.every((item) => validMedia(item, "label")) ||
    (value.pdfMediaId && value.pdfMediaId.length > 191) ||
    (value.videoUrl && !/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)/i.test(value.videoUrl)))
    throw new PostInputError("สื่อในแบบฟอร์มข่าวไม่ถูกต้อง");
  for (const [field, limit] of [["videoTitle", 160], ["videoDescription", 2000], ["videoCaption", 300]] as const) {
    const entry = value[field];
    if (entry !== undefined && (typeof entry !== "string" || entry.length > limit))
      throw new PostInputError("ข้อความวิดีโอในแบบฟอร์มข่าวไม่ถูกต้อง");
  }
  for (const field of ["pdfTitle", "filesTitle"] as const) {
    const entry = value[field];
    if (entry !== undefined && (typeof entry !== "string" || entry.length > 160))
      throw new PostInputError("หัวข้อเอกสารในแบบฟอร์มข่าวไม่ถูกต้อง");
  }
  return value as NewsFormPayload;
}

function dateLabel(value: Date | null): string | null {
  return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(value) : null;
}

const newPostWindowMs = 7 * 24 * 60 * 60 * 1000;

function isNewPost(publishedAt: Date | null, status: PostStatus): boolean {
  if (status !== PostStatus.PUBLISHED || !publishedAt) return false;
  const age = Date.now() - publishedAt.getTime();
  return age >= 0 && age < newPostWindowMs;
}

type PostSnapshot = {
  formPayload?: NewsFormPayload | null;
  title: string;
  excerpt: string;
  categoryId: string;
  unitId: string;
  owner: string;
  coverMediaId: string | null;
  coverFit?: "cover" | "contain";
  coverFocus?: { x: number; y: number };
  coverZoom?: number;
  showCoverInContent: boolean;
  blocks: ArticleBlock[];
};

function publishedSnapshot(post: Post): PostSnapshot {
  if (!isRecord(post.publishedSnapshot) || typeof post.publishedSnapshot.title !== "string" ||
    typeof post.publishedSnapshot.excerpt !== "string" || typeof post.publishedSnapshot.categoryId !== "string" ||
    typeof post.publishedSnapshot.unitId !== "string" || typeof post.publishedSnapshot.owner !== "string" ||
    !(post.publishedSnapshot.coverMediaId === null || typeof post.publishedSnapshot.coverMediaId === "string") ||
    typeof post.publishedSnapshot.showCoverInContent !== "boolean" || !Array.isArray(post.publishedSnapshot.blocks))
    throw new Error("ข่าวที่เผยแพร่ไม่มีข้อมูลฉบับเผยแพร่");
  return post.publishedSnapshot as PostSnapshot;
}

function migratedBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  return migrateTableBlocks(migrateHeadingBlocks(migrateImageBlocks(migrateDocumentListBlocks(migratePdfViewerBlocks(migrateVideoBlocks(migrateGalleryBlocks(migrateDownloadsBlocks(blocks))))))));
}

export function toPostDto(post: Post, publicView = false): DemoPost {
  const content = publicView ? publishedSnapshot(post) : post;
  return {
    id: post.id,
    slug: post.slug,
    title: content.title,
    excerpt: content.excerpt,
    categoryId: content.categoryId,
    unitId: content.unitId === "hospital" ? null : content.unitId,
    owner: content.owner,
    status: post.status === PostStatus.PUBLISHED ? "published" : "draft",
    publishedAt: dateLabel(post.publishedAt),
    hasUnpublishedChanges: publicView ? false : post.hasUnpublishedChanges,
    ...(publicView || post.status !== PostStatus.PUBLISHED || !post.publishedSnapshot ? {} : {
      publishedBlocks: migratedBlocks(publishedSnapshot(post).blocks),
      publishedDetails: {
        title: publishedSnapshot(post).title,
        categoryId: publishedSnapshot(post).categoryId,
        unitId: publishedSnapshot(post).unitId === "hospital" ? null : publishedSnapshot(post).unitId,
        coverMediaId: publishedSnapshot(post).coverMediaId,
        coverFit: (publishedSnapshot(post).coverFit ?? post.publishedCoverFit) as DemoPost["coverFit"],
        coverFocus: publishedSnapshot(post).coverFocus ?? { x: post.publishedCoverFocusX, y: post.publishedCoverFocusY },
        coverZoom: publishedSnapshot(post).coverZoom ?? post.publishedCoverZoom,
      },
    }),
    isNew: isNewPost(post.publishedAt, post.status),
    updatedAt: dateLabel(post.updatedAt) ?? "",
    deletedAt: dateLabel(post.deletedAt),
    coverMediaId: content.coverMediaId,
    coverFit: (publicView ? publishedSnapshot(post).coverFit ?? post.publishedCoverFit : post.coverFit) as DemoPost["coverFit"],
    coverFocus: publicView ? publishedSnapshot(post).coverFocus ?? { x: post.publishedCoverFocusX, y: post.publishedCoverFocusY } : { x: post.coverFocusX, y: post.coverFocusY },
    coverZoom: publicView ? publishedSnapshot(post).coverZoom ?? post.publishedCoverZoom : post.coverZoom,
    showCoverInContent: content.showCoverInContent,
    blocks: migratedBlocks(content.blocks as ArticleBlock[]),
    editorMode: post.editorMode === "form" ? "form" : "blocks",
    ...(publicView ? {} : { formPayload: post.formPayload }),
    revision: post.revision,
    viewCount: post.viewCount,
  };
}

export async function listPosts(includeDrafts: boolean): Promise<DemoPost[]> {
  await connection();
  const posts = await prisma.post.findMany({
    where: { deletedAt: null, ...(includeDrafts ? {} : { status: PostStatus.PUBLISHED, publishedSnapshot: { not: Prisma.DbNull } }) },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  const result = posts.map((post) => toPostDto(post, !includeDrafts));
  return includeDrafts ? result : withCoverUrls(result);
}

async function withCoverUrls(posts: DemoPost[]): Promise<DemoPost[]> {
  const media = await listPublicMediaItemsByIds(posts.flatMap((post) => post.coverMediaId ? [post.coverMediaId] : []));
  const urls = new Map(media.filter((item) => item.kind === "image").map((item) => [item.id, item.previewUrl]));
  return posts.map((post) => ({ ...post, coverImageUrl: post.coverMediaId ? urls.get(post.coverMediaId) ?? null : null }));
}

export async function listDeletedPosts(): Promise<DemoPost[]> {
  const posts = await prisma.post.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  return posts.map((post) => toPostDto(post));
}

export async function getPostCategoryName(categoryId: string): Promise<string> {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } });
  return category?.name ?? "ไม่ระบุหมวดหมู่";
}

const postListSelect = {
  id: true, slug: true, title: true, excerpt: true, categoryId: true,
  unitId: true, owner: true, status: true, publishedAt: true,
  updatedAt: true, deletedAt: true, coverMediaId: true,
  coverFit: true, coverFocusX: true, coverFocusY: true, coverZoom: true,
  showCoverInContent: true, editorMode: true, revision: true, viewCount: true,
  publishedTitle: true, publishedExcerpt: true, publishedCategoryId: true,
  publishedUnitId: true, publishedOwner: true, publishedCoverMediaId: true,
  publishedCoverFit: true, publishedCoverFocusX: true, publishedCoverFocusY: true, publishedCoverZoom: true,
  hasUnpublishedChanges: true,
} satisfies Prisma.PostSelect;

type PostListRow = Prisma.PostGetPayload<{ select: typeof postListSelect }>;

function richTextPreview(snapshot: unknown): string {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.blocks)) return "";
  const nodeText = (node: unknown): string => {
    if (!isRecord(node)) return "";
    if (node.type === "text") return typeof node.text === "string" ? node.text : "";
    const content = Array.isArray(node.content) ? node.content.map(nodeText).join("") : "";
    return ["paragraph", "heading", "listItem", "hardBreak"].includes(String(node.type)) ? `${content} ` : content;
  };
  for (const block of snapshot.blocks) {
    if (!isRecord(block) || block.type !== "text" || block.visibility !== "visible" || !isRecord(block.config)) continue;
    const preview = nodeText(block.config.content).replace(/\s+/g, " ").trim();
    if (preview) return preview.slice(0, 240);
  }
  return "";
}

function toPostListDto(post: PostListRow, publicView = false): DemoPost {
  if (publicView && (!post.publishedTitle || !post.publishedCategoryId || !post.publishedUnitId || !post.publishedOwner))
    throw new Error("ข่าวที่เผยแพร่ไม่มีข้อมูลฉบับเผยแพร่");
  return {
    id: post.id, slug: post.slug, title: publicView ? post.publishedTitle! : post.title, excerpt: publicView ? post.publishedExcerpt ?? "" : post.excerpt,
    categoryId: publicView ? post.publishedCategoryId! : post.categoryId, unitId: (publicView ? post.publishedUnitId : post.unitId) === "hospital" ? null : publicView ? post.publishedUnitId : post.unitId,
    owner: publicView ? post.publishedOwner! : post.owner, status: post.status === PostStatus.PUBLISHED ? "published" : "draft",
    publishedAt: dateLabel(post.publishedAt), isNew: isNewPost(post.publishedAt, post.status), updatedAt: dateLabel(post.updatedAt) ?? "",
    deletedAt: dateLabel(post.deletedAt), coverMediaId: publicView ? post.publishedCoverMediaId : post.coverMediaId,
    coverFit: (publicView ? post.publishedCoverFit : post.coverFit) as DemoPost["coverFit"],
    coverFocus: publicView ? { x: post.publishedCoverFocusX, y: post.publishedCoverFocusY } : { x: post.coverFocusX, y: post.coverFocusY },
    coverZoom: publicView ? post.publishedCoverZoom : post.coverZoom,
    showCoverInContent: publicView ? false : post.showCoverInContent, blocks: [], editorMode: post.editorMode === "form" ? "form" : "blocks", revision: post.revision,
    hasUnpublishedChanges: publicView ? false : post.hasUnpublishedChanges,
    viewCount: post.viewCount,
  };
}

export async function listPublicNewsTabPosts(tab: BlockConfigMap["newsTabs"]["tabs"][number]): Promise<DemoPost[]> {
  const rows = await prisma.post.findMany({
    where: {
      deletedAt: null,
      status: PostStatus.PUBLISHED,
      publishedSnapshot: { not: Prisma.DbNull },
      ...(tab.categoryId ? { publishedCategoryId: tab.categoryId } : {}),
      ...(tab.source.kind === "all" ? {} : {
        publishedUnitId: tab.source.kind === "hospital" ? "hospital" : tab.source.unitId,
      }),
    },
    select: { ...postListSelect, publishedSnapshot: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    take: 4,
  });
  return withCoverUrls(rows.map((post) => ({ ...toPostListDto(post, true), excerpt: richTextPreview(post.publishedSnapshot) })));
}

export async function listPublicPostBlockPage(query: {
  page: number;
  pageSize: number;
  source: BlockConfigMap["posts"]["source"];
  categoryId: string | null;
}): Promise<PublicPostBlockPage> {
  const where: Prisma.PostWhereInput = {
    deletedAt: null,
    status: PostStatus.PUBLISHED,
    publishedSnapshot: { not: Prisma.DbNull },
    ...(query.categoryId ? { publishedCategoryId: query.categoryId } : {}),
    ...(query.source.kind === "all" ? {} : {
      publishedUnitId: query.source.kind === "hospital" ? "hospital" : query.source.unitId,
    }),
  };
  const total = await prisma.post.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await prisma.post.findMany({
    where,
    select: { ...postListSelect, publishedSnapshot: true },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return { items: await withCoverUrls(rows.map((post) => ({ ...toPostListDto(post, true), excerpt: richTextPreview(post.publishedSnapshot) }))), page, pageSize: query.pageSize, total };
}

export type PostPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string | null;
  unitId: string | null;
  year: number | "latest" | null;
  status?: PostStatus | null;
  trash?: boolean;
  publicView?: boolean;
};

function publicationYearRange(year: number): Prisma.DateTimeNullableFilter {
  const gregorian = year - 543;
  return {
    gte: new Date(Date.UTC(gregorian - 1, 11, 31, 17)),
    lt: new Date(Date.UTC(gregorian, 11, 31, 17)),
  };
}

async function publicationYears(unitId: string | null, publicView = false): Promise<number[]> {
  const unitFilter = unitId ? publicView ? Prisma.sql`AND published_unit_id = ${unitId}` : Prisma.sql`AND unit_id = ${unitId}` : Prisma.empty;
  const snapshotFilter = publicView ? Prisma.sql`AND published_snapshot IS NOT NULL` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ year: number }[]>(Prisma.sql`
    SELECT DISTINCT YEAR(DATE_ADD(published_at, INTERVAL 7 HOUR)) + 543 AS year
    FROM cms_posts
    WHERE deleted_at IS NULL AND status = 'PUBLISHED' AND published_at IS NOT NULL ${snapshotFilter} ${unitFilter}
    ORDER BY year DESC
  `);
  return rows.map((row) => Number(row.year));
}

export async function listPostPage(query: PostPageQuery) {
  const trash = Boolean(query.trash);
  const years = await publicationYears(query.publicView ? query.unitId : null, query.publicView);
  const selectedYear = query.year === "latest" ? years[0] ?? null : query.year;
  const search = query.search.trim();
  const baseWhere: Prisma.PostWhereInput = {
    deletedAt: trash ? { not: null } : null,
    ...(query.publicView ? { status: PostStatus.PUBLISHED, publishedSnapshot: { not: Prisma.DbNull } } : {}),
    ...(query.unitId ? { [query.publicView ? "publishedUnitId" : "unitId"]: query.unitId } : {}),
    ...(!trash && selectedYear ? { publishedAt: publicationYearRange(selectedYear) } : {}),
  };
  const where: Prisma.PostWhereInput = {
    ...baseWhere,
    ...(!trash && query.status ? { status: query.status } : {}),
    ...(query.categoryId && !trash ? { [query.publicView ? "publishedCategoryId" : "categoryId"]: query.categoryId } : {}),
    ...(search ? { OR: query.publicView
      ? [{ publishedTitle: { contains: search } }, { publishedExcerpt: { contains: search } }]
      : [{ title: { contains: search } }, { excerpt: { contains: search } }, { owner: { contains: search } }] } : {}),
  };
  const categoryWhere = { ...baseWhere, ...(!trash && query.status ? { status: query.status } : {}) };
  const categoryGroupsPromise = query.publicView
    ? prisma.post.groupBy({ by: ["publishedCategoryId"], where: categoryWhere, _count: { _all: true } })
    : prisma.post.groupBy({ by: ["categoryId"], where: categoryWhere, _count: { _all: true } });
  const [total, categoryGroups, trashTotal] = await Promise.all([
    prisma.post.count({ where }),
    categoryGroupsPromise,
    query.publicView ? Promise.resolve(0) : prisma.post.count({ where: { deletedAt: { not: null } } }),
  ]);
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await prisma.post.findMany({
    where,
    select: { ...postListSelect, publishedSnapshot: Boolean(query.publicView) },
    orderBy: trash ? [{ deletedAt: "desc" }, { id: "asc" }] : query.publicView ? [{ publishedAt: "desc" }, { id: "asc" }] : [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  const items = rows.map((post) => {
    const item = toPostListDto(post, query.publicView);
    return query.publicView ? { ...item, excerpt: richTextPreview(post.publishedSnapshot) } : item;
  });
  const resolvedItems = query.publicView ? await withCoverUrls(items) : items;
  return {
    items: resolvedItems, page, pageSize: query.pageSize, total,
    years, selectedYear,
    categoryCounts: Object.fromEntries(categoryGroups.map((item) => ["publishedCategoryId" in item ? item.publishedCategoryId : item.categoryId, item._count._all])),
    trashTotal,
  };
}

export async function getPublishedPostBySlug(slug: string): Promise<DemoPost | null> {
  const post = await prisma.post.findFirst({
    where: { slug, status: PostStatus.PUBLISHED, deletedAt: null, publishedSnapshot: { not: Prisma.DbNull } },
  });
  return post ? (await withCoverUrls([toPostDto(post, true)]))[0] : null;
}

export async function getPublishedPostTitleBySlug(slug: string): Promise<string | null> {
  const post = await prisma.post.findFirst({
    where: { slug, status: PostStatus.PUBLISHED, deletedAt: null, publishedSnapshot: { not: Prisma.DbNull } },
    select: { publishedTitle: true },
  });
  return post?.publishedTitle ?? null;
}

export async function getRelatedPosts(post: DemoPost, limit = 4): Promise<DemoPost[]> {
  const unitId = post.unitId ?? "hospital";
  const selected: Array<PostListRow & { publishedSnapshot: Prisma.JsonValue }> = [];
  const baseWhere: Prisma.PostWhereInput = {
    status: PostStatus.PUBLISHED,
    deletedAt: null,
    publishedSnapshot: { not: Prisma.DbNull },
  };
  const priorities: Prisma.PostWhereInput[] = [
    { publishedUnitId: unitId, publishedCategoryId: post.categoryId },
    { publishedUnitId: unitId },
    { publishedCategoryId: post.categoryId },
    {},
  ];
  for (const priority of priorities) {
    if (selected.length >= limit) break;
    const rows = await prisma.post.findMany({
      where: {
        ...baseWhere,
        ...priority,
        id: { notIn: [post.id, ...selected.map((item) => item.id)] },
      },
      select: { ...postListSelect, publishedSnapshot: true },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      take: limit - selected.length,
    });
    selected.push(...rows);
  }
  return withCoverUrls(selected.map((item) => ({ ...toPostListDto(item, true), excerpt: richTextPreview(item.publishedSnapshot) })));
}

export async function getPostById(id: string): Promise<DemoPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const post = await prisma.post.findFirst({ where: { id, deletedAt: null } });
  return post ? toPostDto(post) : null;
}

export async function savePost(input: unknown): Promise<DemoPost> {
  if (!isRecord(input)) throw new PostInputError("ข้อมูลข่าวไม่ถูกต้อง");
  const title = text(input.title, "หัวข้อข่าว", 300, true);
  const requestedMode = input.editorMode === "form" ? "form" : "blocks";
  const form = requestedMode === "form" ? formPayload(input.formPayload) : null;
  const excerpt = form ? formExcerpt(form.content) : text(input.excerpt, "คำโปรย", 5000);
  const categoryId = text(input.categoryId, "หมวดหมู่", 36, true);
  const unitId = input.unitId === null ? "hospital" : text(input.unitId, "หน่วยงาน", 100, true);
  const coverMediaId = input.coverMediaId === null ? null : text(input.coverMediaId, "รูปปก", 191);
  const coverFit = input.coverFit ?? "contain";
  const coverFocus = input.coverFocus ?? { x: 50, y: 50 };
  const coverZoom = input.coverZoom ?? 100;
  if (typeof coverZoom !== "number" || !Number.isInteger(coverZoom) || coverZoom < 100 || coverZoom > 300)
    throw new PostInputError("ขนาดรูปปกต้องอยู่ระหว่าง 100–300%");
  if ((coverFit !== "cover" && coverFit !== "contain") || !isRecord(coverFocus) ||
    !Number.isInteger(coverFocus.x as number) || (coverFocus.x as number) < 0 || (coverFocus.x as number) > 100 ||
    !Number.isInteger(coverFocus.y as number) || (coverFocus.y as number) < 0 || (coverFocus.y as number) > 100)
    throw new PostInputError("การแสดงรูปปกไม่ถูกต้อง");
  const coverFocusX = coverFocus.x as number;
  const coverFocusY = coverFocus.y as number;
  if (!["published", "draft"].includes(String(input.status)) || typeof input.showCoverInContent !== "boolean" ||
    (input.publish !== undefined && typeof input.publish !== "boolean"))
    throw new PostInputError("สถานะหรือการแสดงรูปปกไม่ถูกต้อง");
  const publish = input.publish === true;
  const blocks = form ? formBlocks(form) : articleBlocks(input.blocks);
  const category = await prisma.category.findFirst({ where: { id: categoryId, scope: "POSTS", active: true }, select: { id: true } });
  if (!category) throw new PostInputError("ไม่พบหมวดหมู่ข่าวที่เปิดใช้งาน");
  const unit = await prisma.unit.findFirst({ where: { id: unitId, deletedAt: null }, select: { name: true } });
  if (!unit) throw new PostInputError("ไม่พบเจ้าของเนื้อหาในฐานข้อมูล");
  const owner = unit.name;
  const data = { title, excerpt, owner, categoryId, unitId, coverMediaId, coverFit, coverFocusX, coverFocusY, coverZoom, showCoverInContent: input.showCoverInContent, blocks: blocks as Prisma.InputJsonValue, editorMode: requestedMode, formPayload: form ? form as Prisma.InputJsonObject : Prisma.DbNull };
  const snapshot: PostSnapshot = { title, excerpt, categoryId, unitId, owner, coverMediaId, coverFit, coverFocus: { x: coverFocusX, y: coverFocusY }, coverZoom, showCoverInContent: input.showCoverInContent, blocks, ...(form ? { formPayload: form } : {}) };
  const publication = {
    publishedSnapshot: snapshot as Prisma.InputJsonObject,
    publishedTitle: title,
    publishedExcerpt: excerpt,
    publishedCategoryId: categoryId,
    publishedUnitId: unitId,
    publishedOwner: owner,
    publishedCoverMediaId: coverMediaId,
    publishedCoverFit: coverFit,
    publishedCoverFocusX: coverFocusX,
    publishedCoverFocusY: coverFocusY,
    publishedCoverZoom: coverZoom,
    hasUnpublishedChanges: false,
  };
  const id = input.id;
  if (id === "new-post" || id === null || id === undefined) {
    const newId = randomUUID();
    const saved = await prisma.post.create({ data: { ...data, id: newId, slug: newPostSlug(), status: publish ? PostStatus.PUBLISHED : PostStatus.DRAFT, publishedAt: publish ? new Date() : null, ...(publish ? publication : {}) } });
    return toPostDto(saved);
  }
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new PostInputError("รหัสข่าวไม่ถูกต้อง");
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new PostInputError("ข้อมูลข่าวไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new PostInputError("ไม่พบข่าว", 404);
  if (existing.editorMode !== requestedMode) throw new PostInputError("ไม่สามารถเปลี่ยนรูปแบบการเขียนข่าวหลังบันทึกแล้ว");
  const changed = await prisma.post.updateMany({
    where: { id, revision: Number(input.revision), deletedAt: null },
    data: {
      ...data,
      revision: { increment: 1 },
      ...(publish ? { ...publication, status: PostStatus.PUBLISHED, publishedAt: existing.publishedAt ?? new Date() }
        : { hasUnpublishedChanges: existing.status === PostStatus.PUBLISHED && !isDeepStrictEqual(existing.publishedSnapshot, snapshot) }),
    },
  });
  if (!changed.count) throw new PostInputError("ข่าวถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
  return toPostDto(await prisma.post.findUniqueOrThrow({ where: { id } }));
}

export async function incrementPostViews(slug: string, alreadyViewed = false): Promise<number | null> {
  const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, status: true, deletedAt: true, viewCount: true } });
  if (!post || post.deletedAt || post.status !== PostStatus.PUBLISHED) return null;
  if (alreadyViewed) return post.viewCount;
  return (await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } }, select: { viewCount: true } })).viewCount;
}

export async function actOnPost(id: string, action: "duplicate" | "unpublish" | "delete" | "restore" | "purge" | "discardDraft", actorId: string, revision?: number): Promise<DemoPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new PostInputError("รหัสข่าวไม่ถูกต้อง");
  return prisma.$transaction(async (tx) => {
    const original = await tx.post.findUnique({ where: { id } });
    if (!original || (action === "restore" || action === "purge" ? !original.deletedAt : Boolean(original.deletedAt))) throw new PostInputError("ไม่พบข่าว", 404);
    if (action !== "duplicate" && (!Number.isSafeInteger(revision) || !revision || revision < 1))
      throw new PostInputError("ข้อมูลข่าวไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
    let result: Post | null = null;
    if (action === "discardDraft") {
      if (original.status !== PostStatus.PUBLISHED || !original.hasUnpublishedChanges)
        throw new PostInputError("ไม่มีร่างข่าวที่รอเผยแพร่");
      const snapshot = publishedSnapshot(original);
      const changed = await tx.post.updateMany({
        where: { id, revision, deletedAt: null, status: PostStatus.PUBLISHED, hasUnpublishedChanges: true },
        data: {
          title: snapshot.title, excerpt: snapshot.excerpt, categoryId: snapshot.categoryId,
          unitId: snapshot.unitId, owner: snapshot.owner, coverMediaId: snapshot.coverMediaId,
          coverFit: snapshot.coverFit ?? "contain", coverFocusX: snapshot.coverFocus?.x ?? 50, coverFocusY: snapshot.coverFocus?.y ?? 50,
          coverZoom: snapshot.coverZoom ?? 100,
          showCoverInContent: snapshot.showCoverInContent, blocks: snapshot.blocks as Prisma.InputJsonValue,
          formPayload: snapshot.formPayload ? snapshot.formPayload as Prisma.InputJsonObject : Prisma.DbNull,
          hasUnpublishedChanges: false, revision: { increment: 1 },
        },
      });
      if (!changed.count) throw new PostInputError("ข่าวถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
      result = await tx.post.findUniqueOrThrow({ where: { id } });
    } else if (action === "duplicate") {
      const copyId = randomUUID();
      const blocks = Array.isArray(original.blocks)
        ? original.blocks.map((block) => isRecord(block) ? { ...block, id: randomUUID() } : block)
        : [];
      result = await tx.post.create({ data: {
        id: copyId,
        slug: newPostSlug(),
        title: `${original.title} (สำเนา)`.slice(0, 300),
        excerpt: original.excerpt,
        categoryId: original.categoryId,
        unitId: original.unitId,
        owner: original.owner,
        status: PostStatus.DRAFT,
        coverMediaId: original.coverMediaId,
        coverFit: original.coverFit, coverFocusX: original.coverFocusX, coverFocusY: original.coverFocusY,
        coverZoom: original.coverZoom,
        showCoverInContent: original.showCoverInContent,
        blocks: blocks as Prisma.InputJsonValue,
        editorMode: original.editorMode,
        formPayload: original.formPayload ?? Prisma.DbNull,
      } });
    } else if (action === "purge") {
      const deleted = await tx.post.deleteMany({ where: { id, revision, deletedAt: { not: null } } });
      if (!deleted.count) throw new PostInputError("ข่าวถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    } else {
      if (action === "unpublish" && original.status !== PostStatus.PUBLISHED)
        throw new PostInputError("ข่าวนี้ไม่ได้เผยแพร่อยู่");
      const changed = await tx.post.updateMany({
        where: { id, revision, deletedAt: action === "restore" ? { not: null } : null },
        data: action === "restore"
          ? { deletedAt: null, status: PostStatus.DRAFT, publishedAt: null, publishedSnapshot: Prisma.DbNull, publishedTitle: null, publishedExcerpt: null, publishedCategoryId: null, publishedUnitId: null, publishedOwner: null, publishedCoverMediaId: null, hasUnpublishedChanges: false, revision: { increment: 1 } }
          : action === "delete"
          ? { deletedAt: new Date(), revision: { increment: 1 } }
          : { status: PostStatus.DRAFT, publishedAt: null, publishedSnapshot: Prisma.DbNull, publishedTitle: null, publishedExcerpt: null, publishedCategoryId: null, publishedUnitId: null, publishedOwner: null, publishedCoverMediaId: null, hasUnpublishedChanges: false, revision: { increment: 1 } },
      });
      if (!changed.count) throw new PostInputError("ข่าวถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
      if (action === "unpublish" || action === "restore") result = await tx.post.findUniqueOrThrow({ where: { id } });
    }
    await tx.auditLog.create({ data: {
      id: randomUUID(), actorId, action: `post.${action}`, entityType: "post",
      entityId: result?.id ?? id,
      summary: `${action === "duplicate" ? "คัดลอก" : action === "delete" ? "ลบ" : action === "restore" ? "กู้คืน" : action === "purge" ? "ลบถาวร" : action === "discardDraft" ? "ทิ้งร่าง" : "ยกเลิกเผยแพร่"}ข่าว ${original.title}`,
    } });
    return result ? toPostDto(result) : null;
  });
}
