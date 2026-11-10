"use client";

import { CalendarDays, Download } from "lucide-react";
import { documentFileUrl } from "@/features/documents/document-file-name";
import { recordDocumentAccess } from "@/features/documents/record-document-access";
import { documentActionLabel, isPdfFile } from "@/features/media/file-behavior";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import type { SearchDocumentMetadata, SearchItem } from "@/server/search/site-search";

export function SearchDocumentResultLink({ item, document }: { item: SearchItem; document: SearchDocumentMetadata }) {
  const file = document.file;
  const pdf = file ? isPdfFile(file) : false;
  const content = <>
    <DocumentFileIcon file={file} size={19} />
    <span>
      <strong>{item.title}</strong>
      <small className="public-document-card-meta">
        <span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span>
        <span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span>
      </small>
    </span>
  </>;

  if (pdf && file) return <div className="public-document-row public-document-row-with-download unit-document-row-with-download">
    <a className="public-document-open" href={item.href} target="_blank" rel="noreferrer" onClick={() => recordDocumentAccess(item.id, "open")}>{content}</a>
    <a className="public-document-action public-document-download" href={documentFileUrl(item.id, item.title, file.mimeType, "download")} aria-label={`ดาวน์โหลด PDF ${item.title}`} title="ดาวน์โหลด PDF" onClick={() => recordDocumentAccess(item.id, "download")}><Download size={16} /><span>{file.size}</span></a>
  </div>;

  if (!file) return <div className="public-document-row">{content}<b className="public-document-action">0 ไฟล์</b></div>;

  return <a className="public-document-row" href={item.href} onClick={() => recordDocumentAccess(item.id, "download")}>
    {content}
    <span className="public-document-action public-document-download unit-document-download-indicator" title={documentActionLabel(file)}><Download size={16} aria-hidden="true" /><span>{file.size}</span></span>
  </a>;
}
