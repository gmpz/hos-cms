"use client";

import { useEffect, useState } from "react";
import type { BlockConfigMap, PageBlock } from "../config/types";
import { normalizeBlockPosition } from "../config/layout";
import { BannerSlider, SingleBanner } from "./banner-slider";
import { RichText } from "./rich-text";
import { SecondaryRichText } from "./secondary-rich-text";
import {
  DocumentsContentBlock,
  PostsContentBlock,
} from "./dynamic-content-blocks";
import { Gallery } from "./gallery";
import { LinkCards } from "./link-cards";
import { TabbedNewsBlock } from "./tabbed-news-block";
import { MediaInteractionOverlay } from "./media-interaction-overlay";
import {
  getDemoMediaItem,
  hydrateDemoMedia,
  mediaPreviewStyle,
  subscribeDemoMedia,
} from "@/features/media/demo/media-registry";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { DocumentFileLink } from "@/features/media/components/document-file-link";
import { useLinkTargetResolver } from "@/features/navigation/link-target-catalog-context";
import { NavigationIcon } from "@/features/navigation/navigation-icons";
import { pagesChangeEvent } from "@/features/pages/demo/page-list-storage";
import { readUnits } from "@/features/units/demo/storage";
import { formatPhoneWithExtension } from "@/features/users/phone";
import {
  ArrowRight,
  Clock3,
  Contact,
  Download,
  ExternalLink,
  MapPin,
  Phone,
  Users,
} from "lucide-react";

export function blockContainerClassName(block: PageBlock) {
  // Width and position must always describe the visible block content, not a
  // mixture of the outer surface for some blocks and the inner content for
  // others. Spacer is the only block without a visible content frame.
  const contentPlacement = block.type === "spacer" ? "" : " content-placement";
  const position = normalizeBlockPosition(block.width, block.position);
  const legacyHeadingSize = "headingSize" in block.config ? block.config.headingSize : undefined;
  const headingSize = block.headingSize ?? legacyHeadingSize ?? "standard";
  return `content-block${contentPlacement} surface-${block.surface} width-${block.width} block-position-${position} block-heading-align-${block.headingAlign} block-heading-size-${headingSize} spacing-top-${block.surface === "default" ? block.spacingTop : "large"} spacing-bottom-${block.surface === "default" ? block.spacingBottom : "large"} heading-accent-${block.headingAccent}`;
}

export function BlockRenderer({
  blocks,
  adminPreview = false,
  pdfPositionOnly = false,
  loadingDelayMs = 0,
  loadingPresentation = "skeleton",
}: {
  blocks: PageBlock[];
  adminPreview?: boolean;
  pdfPositionOnly?: boolean;
  loadingDelayMs?: number;
  loadingPresentation?: "skeleton" | "level-two";
}) {
  const [, setMediaRevision] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const resolveTarget = useLinkTargetResolver();

  useEffect(() => {
    const refresh = () => setMediaRevision((revision) => revision + 1);
    window.addEventListener(pagesChangeEvent, refresh);
    return () => window.removeEventListener(pagesChangeEvent, refresh);
  }, []);

  useEffect(() => {
    let active = true;
    let delayTimer: number | undefined;
    let mediaFallbackTimer: number | undefined;
    const refresh = () => {
      if (active) setMediaRevision((revision) => revision + 1);
    };
    const unsubscribe = subscribeDemoMedia(refresh);
    const delay = loadingDelayMs > 0
      ? new Promise<void>((resolve) => { delayTimer = window.setTimeout(resolve, loadingDelayMs); })
      : Promise.resolve();
    // Media metadata improves block previews, but a failed or stalled media
    // request must never keep the whole public page behind its loading state.
    const mediaHydration = hydrateDemoMedia().catch(() => undefined);
    const mediaReadyOrTimedOut = Promise.race([
      mediaHydration,
      new Promise<void>((resolve) => {
        mediaFallbackTimer = window.setTimeout(resolve, 4_000);
      }),
    ]);
    void Promise.all([mediaReadyOrTimedOut, delay]).then(() => {
      refresh();
      if (active) setMediaReady(true);
    });
    return () => {
      active = false;
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      if (mediaFallbackTimer !== undefined) window.clearTimeout(mediaFallbackTimer);
      unsubscribe();
    };
  }, [loadingDelayMs]);

  // Public Page Builder routes already have the shared level-two loading
  // boundary in app/(public)/loading.tsx. Once the page payload has arrived,
  // render its blocks immediately and let media metadata hydrate in the
  // background instead of showing a second full-page loader.
  if (!mediaReady && loadingPresentation === "skeleton") {
    return <BlockSkeletonRenderer blocks={blocks} />;
  }

  return (
    <>
      {blocks
        .filter((b) => b.visibility === "visible")
        .map((b) => (
          <section
            key={b.id}
            className={`${blockContainerClassName(b)}${adminPreview ? " block-renderer-edit-guard" : ""}`}
            onClickCapture={adminPreview ? (event) => {
              if (event.target !== event.currentTarget) {
                event.preventDefault();
                event.stopPropagation();
              }
            } : undefined}
            onKeyDownCapture={adminPreview ? (event) => {
              if (event.target !== event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                event.stopPropagation();
              }
            } : undefined}
            onSubmitCapture={adminPreview ? (event) => {
              event.preventDefault();
              event.stopPropagation();
            } : undefined}
          >
            {b.type === "hero" && (
              <SingleBanner
                config={b.config}
                interactionDisabled={adminPreview}
              />
            )}
            {b.type === "bannerSlider" && (
              <BannerSlider
                config={b.config}
                interactionDisabled={adminPreview}
              />
            )}
            {b.type === "heading" && (
              <header className="standalone-heading-block">
                {b.config.level === 2 ? (
                  <h2 className="block-heading">{b.config.text}</h2>
                ) : (
                  <h3 className="block-heading">{b.config.text}</h3>
                )}
                {b.config.description.trim() ? (
                  <p>{b.config.description}</p>
                ) : null}
              </header>
            )}
            {b.type === "text" && <RichText content={b.config.content} />}
            {b.type === "cardText" && (
              <article className="text-card-block">
                <RichText content={b.config.content} />
              </article>
            )}
            {b.type === "image" && (
              b.config.mode === "imageText" ? (
                <div className={`image-text image-${b.config.imagePosition} align-${b.config.verticalAlign} split-${b.config.imageTextSplit}`}>
                  <MediaFigure title="" description="" titleAlign="left" mediaId={b.config.mediaId} alt={b.config.alt || b.config.title} aspectRatio={b.config.aspectRatio} fit={b.config.imageTextDisplay === "crop" ? "cover" : b.config.fit} focalPoint={b.config.focalPoint} zoom={b.config.zoom} interaction={b.config.imageInteraction} interactionDisabled={adminPreview} naturalImage={b.config.imageTextDisplay === "natural"} />
                  <div>
                    <h2>{b.config.title}</h2>
                    <SecondaryRichText value={b.config.description} />
                    {b.config.action ? (
                      <a className="image-text-action" href={resolveTarget(b.config.action.target)} target={b.config.action.openInNewTab ? "_blank" : undefined} rel={b.config.action.openInNewTab ? "noopener noreferrer" : undefined}>
                        {b.config.action.label}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="image-block-frame">
                  <MediaFigure title={b.config.title} description={b.config.description} titleAlign={b.headingAlign} mediaId={b.config.mediaId} alt={b.config.alt} aspectRatio={b.config.aspectRatio} fit={b.config.fit} focalPoint={b.config.focalPoint} zoom={b.config.zoom} interaction={b.config.imageInteraction} interactionDisabled={adminPreview} imageSize={b.config.imageSize} imageAlign={b.config.imageAlign} />
                </div>
              )
            )}
            {b.type === "imageText" && (
              <div className={`image-text image-${b.config.imagePosition} align-${b.config.verticalAlign}`}>
                <MediaVisual mediaId={b.config.imageId} alt={b.config.title} />
                <div>
                  <h2>{b.config.title}</h2>
                  <SecondaryRichText value={b.config.body} />
                  {b.config.action ? <a className="image-text-action" href={resolveTarget(b.config.action.target)} target={b.config.action.openInNewTab ? "_blank" : undefined} rel={b.config.action.openInNewTab ? "noopener noreferrer" : undefined}>{b.config.action.label}</a> : null}
                </div>
              </div>
            )}
            {b.type === "cta" && (
              <div className={`cta-block ${b.config.variant}`}>
                <div>
                  <h2>{b.config.title}</h2>
                  {b.config.description ? <p>{b.config.description}</p> : null}
                </div>
                <a href={resolveTarget(b.config.target)}>
                  {b.config.label}
                </a>
              </div>
            )}
            {b.type === "links" && (
              <div className="quick-links">
                {b.config.items.map((item, index) => (
                  <a
                    key={`${item.label}-${index}`}
                    href={resolveTarget(item.target)}
                  >
                    {item.label}
                    <span>→</span>
                  </a>
                ))}
              </div>
            )}
            {b.type === "linkCards" && <LinkCards config={b.config} />}
            {b.type === "serviceGroups" && <ServiceGroups config={b.config} />}
            {b.type === "gallery" && <Gallery config={b.config} />}
            {b.type === "faq" && (
              <div className="faq-list">
                {b.config.items.map((item, index) => (
                  <details key={`${item.question}-${index}`}>
                    <summary>{item.question}</summary>
                    <SecondaryRichText value={item.answer} />
                  </details>
                ))}
              </div>
            )}
            {b.type === "table" && (
              <div className={`content-table-block align-${b.config.align.split("-")[0]}`}>
                {b.config.caption ? (
                  <h2 className="content-table-title">{b.config.caption}</h2>
                ) : null}
                {b.config.description ? (
                  <div className="content-table-description">
                    <SecondaryRichText value={b.config.description} />
                  </div>
                ) : null}
                <div className={`content-table-wrap${b.config.columnWidths.length === b.config.headers.length ? " is-fixed-width" : ""}`}>
                  <table className="content-table" style={b.config.columnWidths.length === b.config.headers.length
                    ? { width: b.config.columnWidths.reduce((total, width) => total + width, 0), minWidth: b.config.columnWidths.reduce((total, width) => total + width, 0), tableLayout: "fixed" }
                    : undefined}>
                  {b.config.columnWidths.length === b.config.headers.length ? <colgroup>{b.config.columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup> : null}
                  <thead>
                    <tr>
                      {b.config.headers.map((header, index) => (
                        <th key={`${b.id}-header-${index}`} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.config.rows.map((row, rowIndex) => (
                      <tr key={`${b.id}-row-${rowIndex}`}>
                        {row.map((cell, columnIndex) => (
                          <td key={`${b.id}-cell-${rowIndex}-${columnIndex}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
            {b.type === "statistics" && (
              <StatisticsBlock config={b.config} />
            )}
            {b.type === "personnel" && <PersonnelBlock config={b.config} />}
            {b.type === "processSteps" && <ProcessStepsBlock config={b.config} />}
            {b.type === "contactInfo" && <ContactInfoBlock config={b.config} />}
            {b.type === "map" && <MapBlock config={b.config} />}
            {b.type === "timeline" && <TimelineBlock config={b.config} />}
            {b.type === "quote" && (
              <figure className="article-quote">
                <blockquote>{b.config.text}</blockquote>
                {b.config.attribution.trim() ? (
                  <figcaption>
                    <SecondaryRichText value={b.config.attribution} />
                  </figcaption>
                ) : null}
              </figure>
            )}
            {b.type === "alert" && (
              <aside className={`article-alert tone-${b.config.tone}`}>
                <strong>{b.config.title}</strong>
                <p className="article-alert-body">{b.config.body}</p>
              </aside>
            )}
            {b.type === "video" && (
              <div className="article-video-block">
                {b.config.mode === "videoText" ? <div className={`article-video-text split-${b.config.videoTextSplit} video-${b.config.videoPosition} align-${b.config.verticalAlign}`}>
                  <figure className="article-video">
                    <VideoEmbed url={b.config.url} title={b.config.title} />
                    {b.config.caption ? <figcaption>{b.config.caption}</figcaption> : null}
                  </figure>
                  <div className="article-video-copy">
                    {b.config.title?.trim() ? <h2 className={`block-heading article-video-heading size-${b.config.headingSize ?? "standard"}`}>{b.config.title.trim()}</h2> : null}
                    {b.config.description?.trim() ? <div className="article-video-description"><SecondaryRichText value={b.config.description}/></div> : null}
                  </div>
                </div> : <>
                  {b.config.title?.trim() ? <h2 className={`block-heading article-video-heading size-${b.config.headingSize ?? "standard"}`}>{b.config.title.trim()}</h2> : null}
                  {b.config.description?.trim() ? <div className="article-video-description"><SecondaryRichText value={b.config.description}/></div> : null}
                  <figure className="article-video">
                    <VideoEmbed url={b.config.url} title={b.config.title} />
                    {b.config.caption ? <figcaption>{b.config.caption}</figcaption> : null}
                  </figure>
                </>}
              </div>
            )}
            {b.type === "iframe" && <IframeEmbed config={b.config} />}
            {b.type === "pdfViewer" && (
              <>
                {b.config.title?.trim() ? <h2 className="block-heading article-pdf-viewer-heading">{b.config.title.trim()}</h2> : null}
                <PdfViewer config={b.config} align={pdfPositionOnly ? b.position.startsWith("left") ? "left" : b.position.startsWith("right") ? "right" : "center" : b.config.align} />
              </>
            )}
            {b.type === "downloads" && (
              <div className="article-attachment-block">
                {b.config.title?.trim() ? <h2 className={`block-heading article-attachment-heading size-${b.config.headingSize ?? "standard"}`}>{b.config.title.trim()}</h2> : null}
                <div className="public-document-list article-attachment-list">
                {b.config.files.length ? (
                  b.config.files.map((file) => {
                    const media = getDemoMediaItem(file.mediaId);
                    const content = (
                      <>
                        <DocumentFileIcon file={media} size={19} />
                        <span>
                          <strong>{file.label}</strong>
                        </span>
                      </>
                    );
                    if (!media?.previewUrl)
                      return <div className="public-document-row" key={file.mediaId}>{content}</div>;
                    return (
                      <div className="public-document-row article-attachment-row" key={file.mediaId}>
                        <DocumentFileLink className="article-attachment-open" media={media}>
                          {content}
                        </DocumentFileLink>
                        <a className="public-document-action public-document-download article-attachment-download" href={media.previewUrl} download={media.name} aria-label={`ดาวน์โหลด ${file.label}`} title={`ดาวน์โหลด ${file.label}`}>
                          <Download size={16} aria-hidden="true" />
                          <span>{media.size}</span>
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <p className="block-placeholder">ยังไม่มีไฟล์แนบ</p>
                )}
                </div>
              </div>
            )}
            {b.type === "documentList" && (
              <DocumentListBlock config={b.config} />
            )}
            {b.type === "schedule" && (
              <div className="article-schedule">
                <div>
                  <strong>{b.config.dateText || "ยังไม่ระบุวันที่"}</strong>
                  <span>{b.config.timeText}</span>
                </div>
                <div>
                  <strong>{b.config.location || "ยังไม่ระบุสถานที่"}</strong>
                  <p>{b.config.description}</p>
                </div>
              </div>
            )}
            {b.type === "divider" && (
              <div
                className={`article-divider ${b.config.style}`}
                aria-hidden="true"
              />
            )}
            {b.type === "spacer" && (
              <div
                className={`spacer-block size-${b.config.size}`}
                aria-hidden="true"
              />
            )}
            {b.type === "posts" && <PostsContentBlock config={b.config} />}
            {b.type === "newsTabs" && <TabbedNewsBlock config={b.config} />}
            {b.type === "documents" && (
              <DocumentsContentBlock config={b.config} />
            )}
          </section>
        ))}
    </>
  );
}

function BlockSkeletonRenderer({ blocks }: { blocks: PageBlock[] }) {
  const visibleBlocks = blocks.filter((block) => block.visibility === "visible");

  return (
    <>
      <span className="public-loading-sr-only" role="status" aria-live="polite">
        กำลังโหลดเนื้อหาภายในหน้า...
      </span>
      {visibleBlocks.map((block) => (
        <section
          key={block.id}
          className={`${blockContainerClassName(block)} block-content-skeleton block-content-skeleton-${block.type}`}
          aria-hidden="true"
        >
          <BlockSkeleton block={block} />
        </section>
      ))}
    </>
  );
}

function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="block-skeleton-lines">
      {Array.from({ length: count }, (_, index) => (
        <span className="public-loading-shape" key={index} />
      ))}
    </div>
  );
}

function SkeletonCards({ count, columns = 3 }: { count: number; columns?: number }) {
  return (
    <div className={`block-skeleton-cards columns-${Math.min(4, Math.max(2, columns))}`}>
      {Array.from({ length: Math.min(6, Math.max(1, count)) }, (_, index) => (
        <article key={index}>
          <span className="public-loading-shape block-skeleton-card-icon" />
          <SkeletonLines count={3} />
        </article>
      ))}
    </div>
  );
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="block-skeleton-rows">
      {Array.from({ length: Math.min(6, Math.max(1, count)) }, (_, index) => (
        <div key={index}>
          <span className="public-loading-shape block-skeleton-row-icon" />
          <SkeletonLines count={2} />
          <span className="public-loading-shape block-skeleton-row-action" />
        </div>
      ))}
    </div>
  );
}

function SkeletonHeading() {
  return (
    <div className="block-skeleton-heading">
      <span className="public-loading-shape" />
      <span className="public-loading-shape" />
    </div>
  );
}

function BlockSkeleton({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "hero":
    case "bannerSlider": {
      const height = block.config.height;
      return (
        <div className={`banner-slider banner-height-${height} block-skeleton-banner`}>
          <div><SkeletonLines count={3} /></div>
        </div>
      );
    }
    case "heading":
      return <span className="public-loading-shape block-skeleton-heading-only" />;
    case "text":
    case "cardText":
    case "quote":
    case "alert":
      return <SkeletonLines count={block.type === "text" ? 5 : 3} />;
    case "image":
      if (block.config.mode === "imageText") return <div className="block-skeleton-image-text"><span className="public-loading-shape block-skeleton-media" /><SkeletonLines count={5} /></div>;
      return <><SkeletonHeading /><span className="public-loading-shape block-skeleton-media" /></>;
    case "imageText":
      return <div className="block-skeleton-image-text"><span className="public-loading-shape block-skeleton-media" /><SkeletonLines count={5} /></div>;
    case "video":
      if (block.config.mode === "videoText") return <div className="block-skeleton-image-text"><span className="public-loading-shape block-skeleton-media" /><SkeletonLines count={5} /></div>;
      return <><SkeletonHeading /><span className="public-loading-shape block-skeleton-media" /></>;
    case "iframe":
    case "pdfViewer":
    case "map":
      return <><SkeletonHeading /><span className="public-loading-shape block-skeleton-media" /></>;
    case "cta":
      return <div className="block-skeleton-cta"><SkeletonLines count={2} /><span className="public-loading-shape" /></div>;
    case "links":
      return <SkeletonCards count={block.config.items.length} columns={Math.min(4, block.config.items.length)} />;
    case "linkCards":
      return <><SkeletonHeading /><SkeletonCards count={block.config.items.length} columns={block.config.columns} /></>;
    case "serviceGroups":
      return <><SkeletonHeading /><SkeletonCards count={block.config.groups.length} columns={block.config.columns} /></>;
    case "gallery":
      return <><SkeletonHeading /><div className={`block-skeleton-gallery columns-${block.config.columns}`}>{Array.from({ length: Math.min(6, Math.max(1, block.config.images.length)) }, (_, index) => <span className="public-loading-shape" key={index} />)}</div></>;
    case "faq":
      return <SkeletonRows count={block.config.items.length} />;
    case "table":
      return <><SkeletonHeading /><div className="block-skeleton-table"><SkeletonRows count={block.config.rows.length + 1} /></div></>;
    case "statistics":
      return <><SkeletonHeading /><SkeletonCards count={block.config.items.length} columns={block.config.columns} /></>;
    case "personnel":
      return <><SkeletonHeading /><SkeletonCards count={block.config.limit} columns={block.config.columns} /></>;
    case "processSteps":
      return <><SkeletonHeading /><SkeletonRows count={block.config.items.length} /></>;
    case "contactInfo":
      return <><SkeletonHeading /><SkeletonCards count={4} columns={2} /></>;
    case "timeline":
      return <><SkeletonHeading /><SkeletonRows count={block.config.items.length} /></>;
    case "downloads":
      return <><SkeletonHeading /><SkeletonRows count={block.config.files.length} /></>;
    case "documentList":
      return <><SkeletonHeading /><SkeletonRows count={block.config.items.length} /></>;
    case "schedule":
      return <div className="block-skeleton-schedule"><SkeletonLines count={2} /><SkeletonLines count={3} /></div>;
    case "posts":
      return <><SkeletonHeading />{block.config.layout === "list" ? <SkeletonRows count={block.config.limit} /> : <SkeletonCards count={block.config.limit} columns={3} />}</>;
    case "newsTabs":
      return <><SkeletonHeading /><div className="block-skeleton-tabs">{block.config.tabs.map((tab) => <span className="public-loading-shape" key={tab.id} />)}</div><SkeletonCards count={4} columns={3} /></>;
    case "documents":
      return <><SkeletonHeading /><div className="block-skeleton-tabs">{block.config.tabs.map((tab) => <span className="public-loading-shape" key={tab.id} />)}</div>{block.config.layout === "table" ? <SkeletonRows count={block.config.limit} /> : <SkeletonCards count={block.config.limit} columns={3} />}</>;
    case "divider":
      return <div className={`article-divider ${block.config.style}`} />;
    case "spacer":
      return <div className={`spacer-block size-${block.config.size}`} />;
  }
}

function StatisticsBlock({
  config,
}: {
  config: BlockConfigMap["statistics"];
}) {
  return (
    <div className="statistics-block">
      {config.title || config.description ? (
        <header>
          {config.title ? <h2>{config.title}</h2> : null}
          {config.description ? <p>{config.description}</p> : null}
        </header>
      ) : null}
      <div className={`statistics-grid columns-${config.columns}`}>
        {config.items.map((item) => {
          return (
            <article key={item.id}>
              <span><NavigationIcon name={item.icon} size={25} /></span>
              <div>
                <p><strong>{item.value}</strong> <b>{item.label}</b></p>
                {item.description ? <small>{item.description}</small> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BlockHeading({ title, description }: { title: string; description: string }) {
  if (!title && !description) return null;
  return <header className="structured-block-heading">{title ? <h2>{title}</h2> : null}{description ? <p>{description}</p> : null}</header>;
}

function PersonnelBlock({ config }: { config: BlockConfigMap["personnel"] }) {
  const units = readUnits().filter((unit) => unit.status === "published" && (!config.unitId || unit.id === config.unitId));
  const people = units.flatMap((unit) => unit.personnel.map((person) => ({ ...person, unitName: unit.shortName || unit.name }))).slice(0, config.limit);
  return <div className="personnel-block"><BlockHeading title={config.title} description={config.description}/><div className={`personnel-block-grid columns-${config.columns}`}>{people.map((person) => <article key={`${person.unitName}-${person.id}`}><div className="personnel-block-photo" style={person.mediaId ? { ...mediaPreviewStyle(getDemoMediaItem(person.mediaId)), backgroundPosition: `${person.photoFocus.x}% ${person.photoFocus.y}%`, backgroundSize: `${person.photoFocus.zoom ?? 100}% auto` } : undefined}>{!person.mediaId ? <Users size={32}/> : null}</div><div><h3>{person.name}</h3><p>{person.position}</p>{person.expertise ? <small>{person.expertise}</small> : null}<span>{person.unitName}</span></div></article>)}</div>{!people.length ? <p className="structured-block-empty">ยังไม่มีข้อมูลบุคลากร</p> : null}</div>;
}

function ProcessStepsBlock({ config }: { config: BlockConfigMap["processSteps"] }) {
  return <div className="process-steps-block"><BlockHeading title={config.title} description={config.description}/><ol className={`process-steps-list layout-${config.layout}`}>{config.items.map((item, index) => <li key={item.id}><span>{index + 1}</span><div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}</div></li>)}</ol></div>;
}

function ContactInfoBlock({ config }: { config: BlockConfigMap["contactInfo"] }) {
  const phone = config.phone ? formatPhoneWithExtension(config.phone, config.internalPhone) : "";
  const items = [{ key:"location", label:"สถานที่", value:config.location, Icon:MapPin }, { key:"phone", label:"โทรศัพท์", value:phone, Icon:Phone }, { key:"email", label:"อีเมล", value:config.email, Icon:Contact }, { key:"hours", label:"เวลาทำการ", value:config.hours, Icon:Clock3 }].filter((item) => item.value);
  return <div className="contact-info-block"><BlockHeading title={config.title} description={config.description}/><div>{items.map(({ key, label, value, Icon }) => <article key={key}><span><Icon size={22}/></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div></div>;
}

function MapBlock({ config }: { config: BlockConfigMap["map"] }) {
  const [mapResult, setMapResult] = useState<{
    sourceUrl: string;
    embedUrl: string | null;
    externalUrl: string;
  } | null>(null);
  const url = config.url.trim();
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    void fetch(`/api/maps/resolve?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ embedUrl: string; externalUrl: string }> : Promise.reject())
      .then((result) => setMapResult({ sourceUrl: url, ...result }))
      .catch(() => {
        if (!controller.signal.aborted)
          setMapResult({ sourceUrl: url, embedUrl: null, externalUrl: url });
      });
    return () => controller.abort();
  }, [url]);
  const current = mapResult?.sourceUrl === url ? mapResult : null;
  const loading = Boolean(url && !current);
  return <div className="map-block"><BlockHeading title={config.title} description={config.description}/>{current?.embedUrl ? <iframe className={`height-${config.height}`} src={current.embedUrl} title={config.title || "แผนที่"} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/> : <div className={`map-block-placeholder height-${config.height}`}><MapPin size={30}/><span>{loading ? "กำลังโหลดแผนที่..." : url ? "ไม่สามารถแสดงแผนที่จากลิงก์นี้ได้" : "เพิ่มลิงก์แชร์ Google Maps ในการตั้งค่าบล็อก"}</span></div>}{url ? <a href={current?.externalUrl ?? url} target="_blank" rel="noreferrer">เปิดใน Google Maps <ExternalLink size={15}/></a> : null}</div>;
}

function TimelineBlock({ config }: { config: BlockConfigMap["timeline"] }) {
  return <div className="timeline-block"><BlockHeading title={config.title} description={config.description}/><ol>{config.items.map((item) => <li key={item.id}><span>{item.date}</span><div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}</div></li>)}</ol></div>;
}

function DocumentListBlock({
  config,
}: {
  config: BlockConfigMap["documentList"];
}) {
  const counters = [0, 0, 0];
  const automaticNumbers = config.items.map((item) => {
    const levelIndex = item.level - 1;
    for (let parent = 0; parent < levelIndex; parent += 1) {
      if (counters[parent] === 0) counters[parent] = 1;
    }
    counters[levelIndex] += 1;
    for (let child = levelIndex + 1; child < counters.length; child += 1)
      counters[child] = 0;
    return counters.slice(0, item.level).join(".");
  });
  return (
    <section className="article-document-list">
      {config.title || config.description ? (
        <header>
          {config.title ? <h2 className={`size-${config.headingSize ?? "standard"}`}>{config.title}</h2> : null}
          {config.description ? <p>{config.description}</p> : null}
        </header>
      ) : null}
      {config.items.length ? (
        <div>
          {config.items.map((item, index) => {
            const number =
              config.numbering === "automatic"
                ? `${config.numberPrefix ? `${config.numberPrefix}.` : ""}${automaticNumbers[index]}`
                : config.numbering === "manual"
                  ? item.number
                  : "";
            const media =
              item.source?.kind === "media"
                ? getDemoMediaItem(item.source.mediaId)
                : null;
            const rowClassName = `level-${item.level} ${number ? "has-number" : "no-number"} no-icon`;
            const content = (
              <>
                {number ? <b>{number}</b> : null}
                <span>
                  <strong>{item.label || "เอกสาร"}</strong>
                </span>
              </>
            );
            if (item.source?.kind === "media") {
              if (!media?.previewUrl)
                return (
                  <div key={item.id} className={rowClassName}>
                    {content}
                  </div>
                );
              return (
                <DocumentFileLink
                  key={item.id}
                  media={media}
                  className={rowClassName}
                >
                  {content}
                </DocumentFileLink>
              );
            }
            const href =
              item.source?.kind === "external"
                ? safeExternalUrl(item.source.url)
                : null;
            return href ? (
              <a
                key={item.id}
                className={rowClassName}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            ) : (
              <div
                key={item.id}
                className={rowClassName}
              >
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="block-placeholder">ยังไม่มีรายการเอกสาร</p>
      )}
    </section>
  );
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function MediaVisual({
  mediaId,
  alt,
}: {
  mediaId: string | null;
  alt: string;
}) {
  const media = getDemoMediaItem(mediaId);
  return (
    <div
      className={`block-media ${media ? "has-media" : ""}`}
      style={mediaPreviewStyle(media)}
      role="img"
      aria-label={alt || media?.alt || "ยังไม่ได้เลือกรูปภาพ"}
    >
      {media ? null : <span>เลือกรูปภาพ</span>}
    </div>
  );
}
function MediaFigure({
  title,
  description,
  titleAlign,
  mediaId,
  alt,
  aspectRatio,
  fit,
  focalPoint,
  zoom,
  interaction,
  interactionDisabled,
  imageSize,
  imageAlign,
  naturalImage = false,
}: {
  title: string;
  description: string;
  titleAlign: "left" | "center" | "right";
  mediaId: string | null;
  alt: string;
  aspectRatio: import("../config/types").BlockConfigMap["image"]["aspectRatio"];
  fit: import("../config/types").BlockConfigMap["image"]["fit"];
  focalPoint: { x: number; y: number };
  zoom: number;
  interaction: import("../config/types").MediaInteraction;
  interactionDisabled: boolean;
  imageSize?: import("../config/types").BlockConfigMap["image"]["imageSize"];
  imageAlign?: import("../config/types").BlockConfigMap["image"]["imageAlign"];
  naturalImage?: boolean;
}) {
  const media = getDemoMediaItem(mediaId);
  const preserveNaturalRatio = Boolean(imageSize) || naturalImage;
  const dimensions = media?.dimensions.match(/(\d+)\s*[×x]\s*(\d+)/i);
  const originalRatio = dimensions
    ? `${dimensions[1]} / ${dimensions[2]}`
    : undefined;
  return (
    <figure
      className={`image-block ${preserveNaturalRatio ? `natural-image${imageSize ? ` image-size-${imageSize} image-align-${imageAlign ?? "center"}` : ""}` : `ratio-${aspectRatio.replace(":", "-")} fit-${fit}`}`}
    >
      {title || description ? (
        <header className={`image-block-heading align-${titleAlign}`}>
          {title ? <h2 className="image-block-title">{title}</h2> : null}
          {description ? <p className="image-block-description">{description}</p> : null}
        </header>
      ) : null}
      <div
        className={`block-image-visual ${media ? "has-media" : ""}`}
        style={preserveNaturalRatio && media?.previewUrl ? undefined : {
          aspectRatio: aspectRatio === "original" ? originalRatio : undefined,
        }}
        role={preserveNaturalRatio && media?.previewUrl ? undefined : "img"}
        aria-label={preserveNaturalRatio && media?.previewUrl ? undefined : alt || media?.name || "ยังไม่ได้เลือกรูปภาพ"}
      >
        {preserveNaturalRatio && media?.previewUrl ? <>
          {/* Intrinsic dimensions are required here so image-only blocks preserve the uploaded file's natural ratio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.previewUrl} alt={alt || media.name} />
        </> : media?.previewUrl ? <span className="block-image-crop-layer" style={{ ...mediaPreviewStyle(media), backgroundSize: fit, backgroundPosition: `${focalPoint.x}% ${focalPoint.y}%`, transform: fit === "cover" ? `scale(${zoom / 100})` : undefined, transformOrigin: `${focalPoint.x}% ${focalPoint.y}%` }} aria-hidden="true" /> : null}
        <MediaInteractionOverlay
          interaction={interaction}
          mediaId={mediaId}
          label={alt || title || media?.name || "รูปภาพ"}
          disabled={interactionDisabled}
        />
        {media ? null : <span>เลือกรูปภาพ</span>}
      </div>
    </figure>
  );
}
function ServiceGroups({ config }: { config: BlockConfigMap["serviceGroups"] }) {
  const resolveTarget = useLinkTargetResolver();
  return <section className="service-groups-block">
    <header><h2>{config.title}</h2>{config.description ? <p>{config.description}</p> : null}</header>
    <div className={`service-groups-grid columns-${config.columns}`}>
      {config.groups.map((group) => {
        return <article className={`service-group-card accent-${group.accent}`} key={group.id}>
          <div className="service-group-title"><span><NavigationIcon name={group.icon} size={23}/></span><h3>{group.title}</h3></div>
          <div className="service-group-links">
            {group.items.map((item) => <a href={resolveTarget(item.target)} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined} key={item.id}><span><ArrowRight aria-hidden/></span>{item.label}</a>)}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
function VideoEmbed({ url, title }: { url: string; title: string }) {
  if (!url.trim()) {
    return <div className="article-video-empty">ยังไม่มีวิดีโอ</div>;
  }
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/,
  );
  return match ? (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${match[1]}`}
      title={title || "วิดีโอ"}
      loading="lazy"
      allowFullScreen
    />
  ) : (
    <a href={url} target="_blank" rel="noreferrer">
      เปิดวิดีโอ {title}
    </a>
  );
}

function IframeEmbed({
  config,
}: {
  config: import("../config/types").BlockConfigMap["iframe"];
}) {
  const src = safeIframeUrl(config.url);
  return (
    <section className="iframe-content-block">
      {config.title || config.description ? <header>
        {config.title ? <h2>{config.title}</h2> : null}
        {config.description ? <p>{config.description}</p> : null}
      </header> : null}
      {!src ? (
      <div className={`iframe-block iframe-height-${config.height} empty`}>
        <strong>ยังไม่ได้ระบุ URL สำหรับ Iframe</strong>
        <span>รองรับเฉพาะที่อยู่เว็บไซต์แบบ http หรือ https</span>
      </div>
      ) : <div className={`iframe-block iframe-height-${config.height}`}>
      <iframe
        src={src}
        title={config.title || "เนื้อหาจากเว็บไซต์ภายนอก"}
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      </div>}
    </section>
  );
}

function safeIframeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
function PdfViewer({
  config,
  align,
}: {
  config: import("../config/types").BlockConfigMap["pdfViewer"];
  align: "left" | "center" | "right";
}) {
  const media = getDemoMediaItem(config.mediaId);
  const url = media?.previewUrl ?? null;
  const viewerUrl = url ? `${url}#navpanes=0&view=FitH` : null;
  return (
    <figure
      className={`pdf-viewer height-${config.height} align-${align}`}
    >
      {viewerUrl ? (
        <iframe
          src={viewerUrl}
          title={config.title || media?.name || "เอกสาร PDF"}
          loading="lazy"
        />
      ) : (
        <div className="pdf-viewer-empty">
          <span>PDF</span>
          <p>
            {media
              ? "ไฟล์ตัวอย่างนี้ยังไม่มีเนื้อหา PDF กรุณาอัปโหลดไฟล์จริง"
              : "เลือกไฟล์ PDF จากคลังสื่อเพื่อแสดงเอกสาร"}
          </p>
        </div>
      )}
    </figure>
  );
}
