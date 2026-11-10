import type { DemoMediaItem } from "./demo/media-items";

export const documentFileAccept = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

export function fileExtension(name: string) {
  return name.split(".").pop()?.trim().toLocaleLowerCase("en") ?? "";
}

export function isPdfFile(file: Pick<DemoMediaItem, "name" | "mimeType">) {
  return (
    file.mimeType.toLocaleLowerCase("en") === "application/pdf" ||
    fileExtension(file.name) === "pdf"
  );
}

export function isSupportedDocumentFile(file: Pick<File, "name" | "type">) {
  return ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(
    fileExtension(file.name),
  );
}

export function documentActionLabel(
  file: Pick<DemoMediaItem, "name" | "mimeType">,
) {
  return isPdfFile(file) ? "เปิด PDF" : "ดาวน์โหลด";
}
