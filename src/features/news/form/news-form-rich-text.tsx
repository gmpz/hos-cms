"use client";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "@/features/pages/blocks/editors/rich-text-editor-client";

export function NewsFormRichText({ value, onChange }: { value: JSONContent; onChange: (value: JSONContent) => void }) {
  return <RichTextEditor value={value} onChange={onChange} newsForm />;
}
