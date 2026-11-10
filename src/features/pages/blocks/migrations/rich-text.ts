import type { JSONContent } from "@tiptap/react";

export const emptyRichTextDocument: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function textNode(text: string): JSONContent[] | undefined {
  if (!text) return undefined;
  const pattern = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link)
        return {
          type: "text",
          text: link[1],
          marks: [{ type: "link", attrs: { href: link[2] } }],
        };
      if (part.startsWith("**") && part.endsWith("**"))
        return {
          type: "text",
          text: part.slice(2, -2),
          marks: [{ type: "bold" }],
        };
      if (part.startsWith("~~") && part.endsWith("~~"))
        return {
          type: "text",
          text: part.slice(2, -2),
          marks: [{ type: "strike" }],
        };
      if (part.startsWith("*") && part.endsWith("*"))
        return {
          type: "text",
          text: part.slice(1, -1),
          marks: [{ type: "italic" }],
        };
      return { type: "text", text: part };
    });
}

export function richTextDocumentToMarkdown(document: JSONContent): string {
  function render(node: JSONContent): string {
    if (node.type === "text") {
      let value = node.text ?? "";
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") value = `**${value}**`;
        if (mark.type === "italic") value = `*${value}*`;
        if (mark.type === "strike") value = `~~${value}~~`;
        if (mark.type === "link")
          value = `[${value}](${String(mark.attrs?.href ?? "#")})`;
      }
      return value;
    }
    const content = (node.content ?? []).map(render).join("");
    if (node.type === "paragraph") return content;
    if (node.type === "bulletList")
      return (node.content ?? []).map((item) => `- ${render(item)}`).join("\n");
    if (node.type === "orderedList")
      return (node.content ?? [])
        .map((item, index) => `${index + 1}. ${render(item)}`)
        .join("\n");
    if (node.type === "listItem") return content;
    if (node.type === "hardBreak") return "\n";
    return content;
  }
  return (document.content ?? []).map(render).filter(Boolean).join("\n\n");
}

/** Converts the v1 Markdown-like prototype value to the v2 Tiptap document. */
export function richTextDocumentFromMarkdown(markdown: string): JSONContent {
  const lines = markdown.split(/\r?\n/);
  const content: JSONContent[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: JSONContent[] = [];
      while (index < lines.length && lines[index]?.startsWith("- ")) {
        items.push({
          type: "listItem",
          content: [
            { type: "paragraph", content: textNode(lines[index]!.slice(2)) },
          ],
        });
        index += 1;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: JSONContent[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index] ?? "")) {
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: textNode(lines[index]!.replace(/^\d+\.\s/, "")),
            },
          ],
        });
        index += 1;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }
    content.push({ type: "paragraph", content: textNode(line) });
    index += 1;
  }
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}

export function migrateRichTextBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (
      !isRecord(block) ||
      block.type !== "text" ||
      !isRecord(block.config) ||
      block.version !== 1 ||
      typeof block.config.markdown !== "string"
    )
      return block;
    return {
      ...block,
      version: 2,
      config: { content: richTextDocumentFromMarkdown(block.config.markdown) },
    } as T;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
