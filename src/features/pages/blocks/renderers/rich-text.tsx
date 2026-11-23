import { PublicImageLoading } from "@/components/public/public-image-loading";
import type { JSONContent } from "@tiptap/react";
import type { ReactNode } from "react";
import { DocumentFileLink } from "@/features/media/components/document-file-link";
import { getDemoMediaItem } from "@/features/media/demo/media-registry";
import { displayMediaFor } from "@/features/media/resolved-media";

export function RichText({ content }: { content: JSONContent }) {
  return <div className="rich-text-content">{content.content?.map((node, index) => <Node key={index} node={node} />)}</div>;
}

function Node({ node }: { node: JSONContent }): ReactNode {
  const children = node.content?.map((child, index) => <Node key={index} node={child} />);
  if (node.type === "text") {
    let result: ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") result = <strong>{result}</strong>;
      if (mark.type === "italic") result = <em>{result}</em>;
      if (mark.type === "underline") result = <u>{result}</u>;
      if (mark.type === "strike") result = <s>{result}</s>;
      if (mark.type === "code") result = <code>{result}</code>;
      if (mark.type === "highlight") result = <mark style={{ backgroundColor: safeHighlightColor(mark.attrs?.color) }}>{result}</mark>;
      if (mark.type === "link") {
        const href = mark.attrs?.href;
        const media = linkedMedia(mark.attrs);
        result = media ? (
          <DocumentFileLink media={media}>{result}</DocumentFileLink>
        ) : (
          <a
            href={safeHref(href)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {result}
          </a>
        );
      }
    }
    return result;
  }
  if (node.type === "paragraph") {
    const indent = Math.max(0, Math.min(3, Number(node.attrs?.indent) || 0));
    const textAlign = safeTextAlign(node.attrs?.textAlign);
    return <p style={{ ...(indent ? { textIndent: `${indent * 2}em` } : {}), ...(textAlign ? { textAlign } : {}) }}>{node.content?.length ? children : <br />}</p>;
  }
  if (node.type === "heading") {
    const Tag = ({ 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const)[node.attrs?.level as 1 | 2 | 3 | 4 | 5 | 6] ?? "h2";
    return <Tag style={{ textAlign: safeTextAlign(node.attrs?.textAlign) }}>{children}</Tag>;
  }
  if (node.type === "codeBlock") return <pre><code>{children}</code></pre>;
  if (node.type === "taskList") return <ul data-type="taskList">{children}</ul>;
  if (node.type === "taskItem") return <li data-type="taskItem" data-checked={node.attrs?.checked === true}><label><input type="checkbox" checked={node.attrs?.checked === true} disabled aria-label="สถานะรายการ" /></label><div>{children}</div></li>;
  if (node.type === "bulletList") return <ul>{children}</ul>;
  if (node.type === "orderedList") return <ol>{children}</ol>;
  if (node.type === "listItem") return <li>{children}</li>;
  if (node.type === "blockquote") return <blockquote>{children}</blockquote>;
  if (node.type === "hardBreak") return <br />;
  if (node.type === "horizontalRule") return <hr />;
  if (node.type === "table") {
    const columns = tableColumns(node);
    const minimumWidth = Math.max(520, columns.reduce<number>((width, column) => width + (column ?? 25), 0));
    const hasSavedColumnWidths = columns.length > 0 && columns.every((width) => width !== null);
    return <div className="rich-text-table-wrapper"><table style={{ width: hasSavedColumnWidths ? minimumWidth : "100%", minWidth: minimumWidth }}><colgroup>{columns.map((width, index) => <col key={index} style={width ? { width } : { minWidth: 25 }} />)}</colgroup><tbody>{children}</tbody></table></div>;
  }
  if (node.type === "tableRow") return <tr>{children}</tr>;
  if (node.type === "tableHeader") return <th colSpan={safeSpan(node.attrs?.colspan)} rowSpan={safeSpan(node.attrs?.rowspan)}>{children}</th>;
  if (node.type === "tableCell") return <td colSpan={safeSpan(node.attrs?.colspan)} rowSpan={safeSpan(node.attrs?.rowspan)}>{children}</td>;
  if (node.type === "image") {
    const src = safeImageSrc(node.attrs?.src);
    if (!src) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <span className="rich-text-image-frame"><img src={src} alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : ""} title={typeof node.attrs?.title === "string" ? node.attrs.title : undefined} /><PublicImageLoading src={src}/></span>;
  }
  return children ?? null;
}

function safeTextAlign(value: unknown): "left" | "center" | "right" | "justify" | undefined {
  return value === "left" || value === "center" || value === "right" || value === "justify" ? value : undefined;
}

function safeHref(value: unknown) {
  if (typeof value !== "string") return "#";
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try { return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value).protocol) ? value : "#"; }
  catch { return "#"; }
}

function safeImageSrc(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.startsWith("/uploads/")) return value;
  try { return ["http:", "https:"].includes(new URL(value).protocol) ? value : null; }
  catch { return null; }
}

function safeHighlightColor(value: unknown) {
  return ["#bbf7d0", "#bae6fd", "#fecaca", "#e9d5ff", "#fef08a"].includes(String(value))
    ? String(value)
    : undefined;
}

function safeSpan(value: unknown) {
  const span = Number(value);
  return Number.isInteger(span) && span > 1 && span <= 20 ? span : undefined;
}

function tableColumns(table: JSONContent): Array<number | null> {
  const firstRow = table.content?.[0];
  if (firstRow?.type !== "tableRow") return [];
  return (firstRow.content ?? []).flatMap((cell) => {
    const span = safeSpan(cell.attrs?.colspan) ?? 1;
    const widths = Array.isArray(cell.attrs?.colwidth) ? cell.attrs.colwidth : [];
    return Array.from({ length: span }, (_, index) => {
      const width = Number(widths[index]);
      return Number.isFinite(width) && width >= 25 && width <= 2000 ? width : null;
    });
  });
}

function linkedMedia(attrs: Record<string, unknown> | undefined) {
  const value = attrs?.href;
  if (typeof value !== "string" || !value.startsWith("#media:")) return null;
  const media = "mediaAsset" in (attrs ?? {})
    ? displayMediaFor(attrs, "mediaId")
    : getDemoMediaItem(value.slice("#media:".length));
  return media?.mimeType === "application/pdf" ? media : null;
}
