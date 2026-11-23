"use client";
import type { JSONContent } from "@tiptap/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  Clock3,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { DemoDocument } from "@/features/documents/demo/model";
import { DocumentNewBadge } from "@/features/documents/components/document-new-badge";
import { documentFileUrl } from "@/features/documents/document-file-name";
import { documentMedia } from "@/features/documents/document-media";
import {
  mediaPreviewStyle,
} from "@/features/media/demo/media-registry";
import { useLinkTargetResolver } from "@/features/navigation/link-target-catalog-context";
import { isPdfFile } from "@/features/media/file-behavior";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { formatPhoneWithExtension } from "@/features/users/phone";
import { DocumentFileLink } from "@/features/media/components/document-file-link";
import { recordDocumentAccess } from "@/features/documents/record-document-access";
import { RichText } from "@/features/pages/blocks/renderers/rich-text";
import {
  unitSectionLabels,
  unitServiceIconName,
  type DemoUnit,
  type UnitSection,
} from "../demo/model";
import { NavigationIcon } from "@/features/navigation/navigation-icons";
import { personnelPhotoPositionStyle } from "./personnel-photo-position";
import { displayMediaFor } from "@/features/media/resolved-media";
export function PublicUnitPage({ previewUnit, newsContent, initialDocuments = [], initialDocumentTotal = 0, documentsLoaded: initialDocumentsLoaded = false }: { previewUnit?: DemoUnit; newsContent?: ReactNode; initialDocuments?: DemoDocument[]; initialDocumentTotal?: number; documentsLoaded?: boolean }) {
  const pageRef = useRef<HTMLElement>(null);
  const unit = previewUnit ?? null;
  const documents = initialDocuments;
  const documentsLoaded = initialDocumentsLoaded;
  useEffect(() => {
    const page = pageRef.current;
    if (!unit || !page || typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target as HTMLElement;
        section.dataset.scrollReveal = "visible";
        observer.unobserve(section);
      });
    }, { rootMargin: "0px 0px -38% 0px", threshold: 0.08 });

    page.querySelectorAll<HTMLElement>(":scope > .unit-public-section").forEach((section) => {
      if (section.dataset.scrollReveal === "visible") return;
      section.dataset.scrollReveal = "pending";
      observer.observe(section);
    });

    const main = page.closest<HTMLElement>(".public-main");
    let lastWidth = main?.getBoundingClientRect().width ?? 0;
    let frame = 0;
    const reconcileAfterLayout = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        page.querySelectorAll<HTMLElement>(":scope > .unit-public-section").forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
          if (section.dataset.scrollReveal === "pending") {
            section.dataset.scrollReveal = "visible";
            observer.unobserve(section);
          }
        });
      });
    };
    const resizeObserver = main && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          const width = main.getBoundingClientRect().width;
          if (Math.abs(width - lastWidth) < 1) return;
          lastWidth = width;
          reconcileAfterLayout();
        })
      : null;
    if (main) resizeObserver?.observe(main);
    window.addEventListener("scroll", reconcileAfterLayout, { passive: true });
    reconcileAfterLayout();
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === main && event.propertyName === "margin-left") reconcileAfterLayout();
    };
    main?.addEventListener("transitionend", onTransitionEnd);

    return () => {
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", reconcileAfterLayout);
      main?.removeEventListener("transitionend", onTransitionEnd);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [unit]);
  if (!unit)
    return (
      <div className="public-unit-missing">
        <h1>ไม่พบกลุ่มงาน</h1>
        <p>หน้านี้ยังไม่ได้เผยแพร่หรือไม่มีอยู่ในระบบ</p>
      </div>
    );
  return (
    <article ref={pageRef} className="public-unit">
      <header className="unit-hero">
        <div>
          <p className="unit-hero-eyebrow">หน่วยงานของโรงพยาบาล</p>
          <h1>{unit.name}</h1>
          {unit.summary ? <span className="unit-hero-summary">{unit.summary}</span> : null}
        </div>
      </header>
      {unit.sectionOrder
        .filter((section) => unit.sectionVisibility[section])
        .map((section) => (
          <UnitPublicSection
            key={section}
            section={section}
            unit={unit}
            newsContent={newsContent}
            documentTotal={initialDocumentTotal}
            documents={documents}
            documentsLoaded={documentsLoaded}
            muted={unit.sectionBackground[section]}
          />
        ))}
    </article>
  );
}
function hasRichTextContent(content: JSONContent): boolean {
  if (content.text?.trim()) return true;
  return (content.content ?? []).some(hasRichTextContent);
}

function UnitPublicSection({
  section,
  unit,
  newsContent,
  documentTotal,
  documents,
  documentsLoaded,
  muted,
}: {
  section: UnitSection;
  unit: DemoUnit;
  newsContent?: ReactNode;
  documentTotal: number;
  documents: DemoDocument[];
  documentsLoaded: boolean;
  muted: boolean;
}) {
  const resolveTarget = useLinkTargetResolver();
  const [visionExpanded, setVisionExpanded] = useState(false);
  const [missionExpanded, setMissionExpanded] = useState(false);
  const hasVision = unit.visionStatement !== undefined ? Boolean(unit.visionStatement.trim()) : hasRichTextContent(unit.vision);
  const visionCanExpand = (unit.visionStatement?.trim().length ?? 0) > 120;
  const missionItems = (unit.missionItems ?? []).filter((item) => item.title.trim() && item.description.trim());
  const missionCanExpand = missionItems.length > 4;
  const visibleMissionItems = missionCanExpand && !missionExpanded ? missionItems.slice(0, 4) : missionItems;
  const hasMission = unit.missionItems !== undefined ? missionItems.length > 0 : hasRichTextContent(unit.mission);
  if (section === "about") {
    if (!hasVision && !hasMission) return null;
    return (
      <section className={`unit-public-section unit-about-section ${muted ? "muted" : ""}`}>
        <header className="unit-section-intro">
          <h2>{unitSectionLabels[section]}</h2>
          <p>ทิศทาง เป้าหมาย และพันธกิจในการดำเนินงานของกลุ่มงาน</p>
        </header>
        <div className={`unit-about-editorial unit-about-reference-layout${hasVision && hasMission ? " has-both" : ""}`}>
          {hasVision ? <article className="unit-vision-card">
            <div className="unit-about-card-heading"><h2>วิสัยทัศน์</h2></div>
            {unit.visionStatement !== undefined ? <blockquote className={visionCanExpand && !visionExpanded ? "is-collapsed" : undefined}>{unit.visionStatement}</blockquote> : <RichText content={unit.vision} />}
            {visionCanExpand ? <button type="button" className="unit-vision-more" aria-expanded={visionExpanded} onClick={() => setVisionExpanded((current) => !current)}>{visionExpanded ? "ย่อข้อความ" : "อ่านเพิ่มเติม"}</button> : null}
          </article> : null}
          {hasMission ? <article className="unit-mission-card">
            <div className="unit-about-card-heading">
              <h2>พันธกิจ</h2>
              {missionCanExpand ? <button type="button" className="unit-mission-more" aria-expanded={missionExpanded} onClick={() => setMissionExpanded((current) => !current)}>{missionExpanded ? "แสดงน้อยลง" : `ดูทั้งหมด (${missionItems.length})`}<ArrowRight aria-hidden="true" size={16} /></button> : null}
            </div>
            {unit.missionItems !== undefined ? <>
              <ol className="unit-mission-grid">{visibleMissionItems.map((item, index) => {
                const isTeaser = missionCanExpand && !missionExpanded && index === 3;
                return <li key={item.id} className={isTeaser ? "is-teaser" : undefined} aria-hidden={isTeaser || undefined}><span>{String(index + 1).padStart(2, "0")}</span><h4>{item.title}</h4><p>{item.description}</p></li>;
              })}</ol>
            </> : <RichText content={unit.mission} />}
          </article> : null}
        </div>
      </section>
    );
  }
  if (section === "services")
    return (
      <section className={`unit-public-section unit-services-section ${muted ? "muted" : ""}`}>
        <header className="unit-section-intro">
          <h2>{unitSectionLabels[section]}</h2>
          <p>รวมบริการ ระบบ และช่องทางสำคัญที่เกี่ยวข้องกับกลุ่มงาน</p>
        </header>
        <div className="service-groups-grid columns-3 unit-service-groups-grid">
          {unit.services.length ? (
            unit.services.map((group) => {
              return <article className={`service-group-card accent-${group.accent}`} key={group.id}>
                <div className="service-group-title"><span><NavigationIcon name={unitServiceIconName(group.icon)} size={23}/></span><h3>{group.title}</h3></div>
                <div className="service-group-links">
                  {group.items.map((item) => <a href={resolveTarget(item.target)} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined} key={item.id}><span><ArrowRight aria-hidden="true"/></span>{item.label}</a>)}
                </div>
              </article>;
            })
          ) : (
            <p>ยังไม่มีเมนูบริการที่เกี่ยวข้อง</p>
          )}
        </div>
      </section>
    );
  if (section === "personnel")
    return (
      <section className={`unit-public-section unit-personnel-section ${muted ? "muted" : ""}`}>
        <header className="unit-section-intro">
          <h2>{unitSectionLabels[section]}</h2>
          <p>รายชื่อบุคลากรและผู้รับผิดชอบ</p>
        </header>
        {unit.personnel.length ? (
          <div className="unit-person-grid">
            {unit.personnel.map((person) => {
              const photo = displayMediaFor(person);
              return (
                <article key={person.id}>
                  <div
                    className={`unit-person-avatar ${photo ? "has-photo" : ""}`}
                    style={{
                      ...mediaPreviewStyle(photo),
                      ...personnelPhotoPositionStyle(person.photoFocus),
                    }}
                  >
                    {photo ? null : <UserRound size={32} />}
                  </div>
                  <strong>{person.name || "ยังไม่ระบุชื่อ"}</strong>
                  <span className="unit-person-position"><span className="unit-person-title">{person.position}</span>{person.level ? <><wbr /><span className="unit-person-level">{person.level}</span></> : null}</span>
                  {person.expertise ? <p>{person.expertise}</p> : null}
                  <div className="unit-person-contact">
                    {person.phone ? <a href={`tel:${person.phone}${person.phoneExtension ? `,${person.phoneExtension}` : ""}`}><Phone size={14}/><span>{formatPhoneWithExtension(person.phone, person.phoneExtension)}</span></a> : <span className="unit-person-contact-empty"><Phone size={14}/><span>ไม่ระบุ</span></span>}
                    {person.email ? <a href={`mailto:${person.email}`}><Mail size={14}/><span title={person.email}>{person.email}</span></a> : <span className="unit-person-contact-empty"><Mail size={14}/><span>ไม่ระบุ</span></span>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="unit-person-placeholder">
            <UserRound size={28} />
            <strong>ยังไม่มีข้อมูลบุคลากร</strong>
            <p>เพิ่มบุคลากรได้จากหน้าตั้งค่ากลุ่มงาน</p>
          </div>
        )}
      </section>
    );
  if (section === "posts") {
    const allNewsHref = `/news?unit=${encodeURIComponent(unit.id)}&year=all`;
    return (
      <section className={`unit-public-section unit-news-section ${muted ? "muted" : ""}`}>
        <div className="unit-section-heading">
          <div>
            <h2>{unitSectionLabels[section]}</h2>
            <p>ติดตามข่าวสาร กิจกรรม และผลงานล่าสุดของกลุ่มงาน</p>
          </div>
          <Link href={allNewsHref}>
            ดูข่าวทั้งหมด →
          </Link>
        </div>
        {newsContent}
      </section>
    );
  }
  if (section === "documents")
    return (
      <UnitDocumentsSection
        unit={unit}
        documents={documents}
        total={documentTotal}
        documentsLoaded={documentsLoaded}
        muted={muted}
      />
    );
  return (
    <section
      className={`unit-public-section unit-contact ${muted ? "muted" : ""}`}
    >
      <header className="unit-contact-heading">
        <h2>{unitSectionLabels[section]}</h2>
        <p>ช่องทางสำหรับติดต่อสอบถามและขอรับบริการจากกลุ่มงาน</p>
      </header>
      <div className="unit-contact-grid">
        <article className="unit-contact-card unit-contact-location">
          <span className="unit-contact-icon">
            <MapPin size={22} aria-hidden="true" />
          </span>
          <div>
            <small>สถานที่</small>
            <strong>{unit.contact.location || "โรงพยาบาลคลองหลวง"}</strong>
          </div>
        </article>
        <a
          className="unit-contact-card"
          href={
            unit.contact.phone
              ? `tel:${unit.contact.phone.replace(/[^+\d]/g, "")}`
              : undefined
          }
        >
          <span className="unit-contact-icon">
            <Phone size={22} aria-hidden="true" />
          </span>
          <div>
            <small>โทรศัพท์</small>
            <strong>
              {unit.contact.phone
                ? formatPhoneWithExtension(
                    unit.contact.phone,
                    unit.contact.internalPhone,
                  )
                : "ยังไม่มีข้อมูล"}
            </strong>
          </div>
        </a>
        {unit.contact.email ? (
          <a
            className="unit-contact-card"
            href={`mailto:${unit.contact.email}`}
          >
            <span className="unit-contact-icon">
              <Mail size={22} aria-hidden="true" />
            </span>
            <div>
              <small>อีเมล</small>
              <strong>{unit.contact.email}</strong>
            </div>
          </a>
        ) : null}
        <article className="unit-contact-card">
          <span className="unit-contact-icon">
            <Clock3 size={22} aria-hidden="true" />
          </span>
          <div>
            <small>เวลาทำการ</small>
            <strong>{unit.contact.hours || "ยังไม่มีข้อมูล"}</strong>
          </div>
        </article>
      </div>
    </section>
  );
}

function UnitDocumentsSection({
  unit,
  documents,
  total,
  documentsLoaded,
  muted,
}: {
  unit: DemoUnit;
  documents: DemoDocument[];
  total: number;
  documentsLoaded: boolean;
  muted: boolean;
}) {
  const unitDocuments = documents.filter(
    (document) =>
      document.status === "published" && document.unitId === unit.id,
  );
  const visibleDocuments = unitDocuments.slice(0, 10);
  const allDocumentsHref = `/documents?unit=${encodeURIComponent(unit.id)}&year=all`;

  return (
    <section className={`unit-public-section unit-documents-section ${muted ? "muted" : ""}`}>
      <div className="unit-section-heading">
        <div>
          <h2>{unitSectionLabels.documents}</h2>
          <p>ค้นหาและดาวน์โหลดเอกสารเผยแพร่ของกลุ่มงาน</p>
        </div>
        <Link href={allDocumentsHref}>
          ดูเอกสารทั้งหมด →
        </Link>
      </div>
      {!documentsLoaded ? (
        <div className="unit-empty-state" role="status"><p>กำลังโหลดเอกสาร...</p></div>
      ) : unitDocuments.length ? (
        <>
          <div className="unit-document-list">
            {visibleDocuments.map((document, index) => {
              const media = documentMedia(document);
              const revealStyle = { "--document-reveal-delay": `${Math.min(index, 15) * 90}ms` } as CSSProperties;
              if (media && isPdfFile(media))
                return (
                  <div className="unit-document-row-with-download" key={document.id} style={revealStyle}>
                    <DocumentFileLink className="unit-document-open" media={media} href={documentFileUrl(document.id, document.title, media.mimeType)}>
                      <DocumentFileIcon file={media} size={19} />
                      <span><strong>{document.title}</strong><small className="public-document-card-meta"><span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span><span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span><DocumentNewBadge isNew={document.isNew}/></small></span>
                    </DocumentFileLink>
                    <a className="public-document-action public-document-download" href={documentFileUrl(document.id, document.title, media.mimeType, "download")} aria-label={`ดาวน์โหลด PDF ${document.title}`} title="ดาวน์โหลด PDF" onClick={() => recordDocumentAccess(document.id, "download")}><Download size={16}/><span>{media.size}</span></a>
                  </div>
                );
              const content = (
                <>
                  <DocumentFileIcon file={media} size={19} />
                  <span>
                    <strong>{document.title}</strong>
                    <small className="public-document-card-meta"><span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span><span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span><DocumentNewBadge isNew={document.isNew}/></small>
                  </span>
                  {media ? <span className="public-document-action public-document-download unit-document-download-indicator" title="ดาวน์โหลดไฟล์"><Download size={16} aria-hidden="true"/><span>{media.size}</span></span> : <b className="public-document-action">{document.mediaIds.length} ไฟล์</b>}
                </>
              );
              if (!media)
                return <div key={document.id} style={revealStyle}>{content}</div>;
              return (
                <DocumentFileLink key={document.id} media={media} href={documentFileUrl(document.id, document.title, media.mimeType)} style={revealStyle}>
                  {content}
                </DocumentFileLink>
              );
            })}
          </div>
          <div className="unit-section-list-summary"><span>แสดงเอกสารล่าสุด {visibleDocuments.length} จาก {total} รายการ</span>{total > visibleDocuments.length ? <Link href={allDocumentsHref}>ดูเอกสารที่เหลือ →</Link> : null}</div>
        </>
      ) : (
        <div className="unit-empty-state">
          <FileText size={27} />
          <strong>ไม่พบเอกสาร</strong>
          <p>กลุ่มงานนี้ยังไม่มีเอกสารที่เผยแพร่</p>
        </div>
      )}
    </section>
  );
}
