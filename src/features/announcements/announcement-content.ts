import type { JSONContent } from "@tiptap/react";
import { richTextDocumentFromMarkdown } from "@/features/pages/blocks/migrations/rich-text";

const prefix = "annrt:v1:";

export function announcementContentDocument(value: string): JSONContent {
  if (value.startsWith(prefix)) {
    try {
      const parsed: unknown = JSON.parse(value.slice(prefix.length));
      if (parsed && typeof parsed === "object" && "type" in parsed && parsed.type === "doc" && "content" in parsed && Array.isArray(parsed.content))
        return parsed as JSONContent;
    } catch { /* Existing plain-text announcements remain readable. */ }
  }
  return richTextDocumentFromMarkdown(value);
}

export function announcementPlainText(value: string): string {
  const collect = (node: JSONContent): string => [node.text ?? "", ...(node.content ?? []).map(collect)].join(" ");
  return collect(announcementContentDocument(value)).replace(/\s+/g, " ").trim();
}

export function serializeAnnouncementContent(document: JSONContent): string {
  const value = `${prefix}${JSON.stringify(document)}`;
  return announcementPlainText(value) ? value : "";
}
