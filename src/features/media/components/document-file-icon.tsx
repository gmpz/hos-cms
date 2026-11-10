import { File, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import type { DemoMediaItem } from "../demo/media-items";
import { fileExtension, isPdfFile } from "../file-behavior";

export function DocumentFileIcon({
  file,
  size = 20,
}: {
  file: Pick<DemoMediaItem, "name" | "mimeType"> | null;
  size?: number;
}) {
  const extension = file ? fileExtension(file.name) : "";
  const mimeType = file?.mimeType.toLocaleLowerCase("en") ?? "";
  const kind =
    file && isPdfFile(file)
      ? "pdf"
      : ["doc", "docx"].includes(extension) ||
          [
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ].includes(mimeType)
        ? "word"
        : ["xls", "xlsx"].includes(extension) ||
            [
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ].includes(mimeType)
          ? "excel"
          : ["ppt", "pptx"].includes(extension) ||
              [
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              ].includes(mimeType)
            ? "powerpoint"
            : "generic";
  const Icon =
    kind === "excel"
      ? FileSpreadsheet
      : kind === "powerpoint"
        ? Presentation
        : kind === "generic"
          ? File
          : FileText;
  const label =
    kind === "pdf"
      ? "PDF"
      : kind === "word"
        ? "DOC"
        : kind === "excel"
          ? "XLS"
          : kind === "powerpoint"
            ? "PPT"
            : "FILE";
  return (
    <span
      className={`document-file-icon type-${kind}`}
      title={file?.name ?? "ไฟล์เอกสาร"}
      aria-label={`ไฟล์ ${label}`}
    >
      <Icon size={size} />
      <small>{label}</small>
    </span>
  );
}
