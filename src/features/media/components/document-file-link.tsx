"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { DemoMediaItem } from "../demo/media-items";
import { isPdfFile } from "../file-behavior";
import { documentIdFromFileUrl, recordDocumentAccess } from "@/features/documents/record-document-access";

export function DocumentFileLink({
  media,
  href,
  className,
  style,
  children,
}: {
  media: DemoMediaItem;
  href?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const opensInBrowser = isPdfFile(media);

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (href) {
      const documentId = documentIdFromFileUrl(href);
      if (documentId) recordDocumentAccess(documentId, media.mimeType === "application/pdf" ? "open" : "download");
    }
    if (href || !opensInBrowser || !media.previewUrl?.startsWith("data:")) return;
    const objectUrl = dataUrlToObjectUrl(media.previewUrl);
    if (!objectUrl) return;
    event.preventDefault();
    const link = document.createElement("a");
    link.href = objectUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  return (
    <a
      className={className}
      style={style}
      href={href ?? media.previewUrl ?? "#"}
      target={opensInBrowser ? "_blank" : undefined}
      rel={opensInBrowser ? "noreferrer" : undefined}
      download={opensInBrowser || href ? undefined : media.name}
      onClick={open}
    >
      {children}
    </a>
  );
}

function dataUrlToObjectUrl(dataUrl: string) {
  try {
    const [header, payload] = dataUrl.split(",", 2);
    if (!header || payload === undefined) return null;
    const mimeType = header.match(/^data:([^;,]+)/)?.[1] ?? "application/pdf";
    const binary = header.includes(";base64")
      ? window.atob(payload)
      : decodeURIComponent(payload);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  } catch {
    return null;
  }
}
