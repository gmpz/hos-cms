"use client";
import { CalendarDays, Download } from "lucide-react";
import { documentActionLabel, isPdfFile } from "@/features/media/file-behavior";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { DocumentFileLink } from "@/features/media/components/document-file-link";
import { DocumentNewBadge } from "./document-new-badge";
import { documentFileUrl } from "../document-file-name";
import { recordDocumentAccess } from "../record-document-access";
import { documentMedia } from "../document-media";
import type { DemoDocument } from "../demo/model";

export function PublicDocumentRow({
  document,
}: {
  document: DemoDocument;
}) {
  const media = documentMedia(document);
  if (media && isPdfFile(media)) {
    return <div className="unit-document-row-with-download">
      <DocumentFileLink className="unit-document-open" media={media} href={documentFileUrl(document.id, document.title, media.mimeType)}>
        <DocumentFileIcon file={media} size={19} />
        <span>
          <strong>{document.title}</strong>
          <small className="document-block-card-meta">
            <span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span>
            <span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span>
            <DocumentNewBadge isNew={document.isNew}/>
          </small>
        </span>
      </DocumentFileLink>
      <a className="public-document-action public-document-download" href={documentFileUrl(document.id, document.title, media.mimeType, "download")} aria-label={`ดาวน์โหลด PDF ${document.title}`} title="ดาวน์โหลด PDF" onClick={() => recordDocumentAccess(document.id, "download")}><Download size={16}/><span>{media.size}</span></a>
    </div>;
  }
  const content = (
    <>
      <DocumentFileIcon file={media} size={19} />
      <span>
        <strong>{document.title}</strong>
        <small className="document-block-card-meta">
          <span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span>
          <span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span>
          <DocumentNewBadge isNew={document.isNew}/>
        </small>
      </span>
      {media ? <span className="public-document-action public-document-download unit-document-download-indicator" title={documentActionLabel(media)}><Download size={16} aria-hidden="true"/><span>{media.size}</span></span> : <b className="public-document-action">{document.mediaIds.length} ไฟล์</b>}
    </>
  );
  if (!media)
    return <div>{content}</div>;
  return (
    <DocumentFileLink media={media} href={documentFileUrl(document.id, document.title, media.mimeType)}>
      {content}
    </DocumentFileLink>
  );
}
