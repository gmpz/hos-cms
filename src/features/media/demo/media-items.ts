export type DemoMediaItem = {
  id: string;
  name: string;
  kind: "image" | "document";
  mimeType: string;
  size: string;
  sizeBytes: number;
  dimensions: string;
  uploadedAt: string;
  uploadedBy: string;
  alt: string;
  previewUrl: string | null;
  tone: number;
};

