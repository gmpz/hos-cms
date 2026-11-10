const extensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

export function documentFileName(title: string, mimeType: string): string {
  const normalizedTitle = Array.from(
    title.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim(),
  ).slice(0, 120).join("").replace(/[. ]+$/g, "") || "เอกสาร";
  const extension = extensionByMimeType[mimeType.toLowerCase()] ?? "bin";
  const safeTitle = normalizedTitle.toLowerCase().endsWith(`.${extension}`)
    ? normalizedTitle.slice(0, -(extension.length + 1))
    : normalizedTitle;
  return `${safeTitle || "เอกสาร"}.${extension}`;
}

export function documentFileUrl(id: string, title: string, mimeType: string, intent?: "download"): string {
  const path = `/api/documents/${encodeURIComponent(id)}/file/${encodeURIComponent(documentFileName(title, mimeType))}`;
  return intent === "download" ? `${path}?intent=download` : path;
}
