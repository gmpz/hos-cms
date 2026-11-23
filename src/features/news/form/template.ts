import type { JSONContent } from "@tiptap/react";
import type { ArticleBlock } from "@/features/pages/blocks/config/types";
import { createBlock } from "@/features/pages/demo/model";

export type NewsFormPayload = {
  version: 1;
  content: JSONContent;
  images: { mediaId: string; alt: string }[];
  videoUrl: string;
  videoTitle?: string;
  videoDescription?: string;
  videoCaption?: string;
  pdfMediaId: string | null;
  pdfTitle?: string;
  files: { mediaId: string; label: string }[];
  filesTitle?: string;
};

export const emptyNewsForm = (): NewsFormPayload => ({
  version: 1, content: { type: "doc", content: [{ type: "paragraph" }] },
  images: [], videoUrl: "", videoTitle: "", videoDescription: "", videoCaption: "", pdfMediaId: null, pdfTitle: "", files: [], filesTitle: "",
});

function plainText(node: JSONContent): string {
  return (node.text ?? "") + (node.content ?? []).map(plainText).join(" ");
}

export function formExcerpt(content: JSONContent): string {
  return plainText(content).replace(/\s+/g, " ").trim().slice(0, 240);
}

export function formBlocks(form: NewsFormPayload): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const text = createBlock("text", "form-content") as Extract<ArticleBlock, { type: "text" }>;
  blocks.push({ ...text, width: "full", config: { content: form.content } });
  if (form.images.length) {
    const gallery = createBlock("gallery", "form-gallery") as Extract<ArticleBlock, { type: "gallery" }>;
    blocks.push({ ...gallery, width: "standard", config: { ...gallery.config, title: "", images: form.images } });
  }
  if (form.videoUrl) {
    const video = createBlock("video", "form-video") as Extract<ArticleBlock, { type: "video" }>;
    blocks.push({ ...video, width: "standard", config: {
      ...video.config, url: form.videoUrl,
      title: form.videoTitle?.trim() ?? "",
      description: form.videoDescription?.trim() ?? "",
      caption: form.videoCaption?.trim() ?? "",
    } });
  }
  if (form.pdfMediaId) {
    const pdf = createBlock("pdfViewer", "form-pdf") as Extract<ArticleBlock, { type: "pdfViewer" }>;
    blocks.push({ ...pdf, width: "standard", config: { ...pdf.config, title: form.pdfTitle?.trim() ?? "", mediaId: form.pdfMediaId } });
  }
  if (form.files.length) {
    const downloads = createBlock("downloads", "form-files") as Extract<ArticleBlock, { type: "downloads" }>;
    blocks.push({ ...downloads, width: "standard", config: { ...downloads.config, title: form.filesTitle?.trim() ?? "", files: form.files } });
  }
  return blocks;
}
