"use client";

import { RichTextEditor } from "./rich-text-editor-client";
import {
  richTextDocumentFromMarkdown,
  richTextDocumentToMarkdown,
} from "../migrations/rich-text";

export function SecondaryRichTextEditor({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <RichTextEditor
      value={richTextDocumentFromMarkdown(value)}
      onChange={(content) => onChange(richTextDocumentToMarkdown(content))}
      compact={compact}
    />
  );
}
