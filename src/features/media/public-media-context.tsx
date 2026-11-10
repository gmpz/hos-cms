"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { UploadedMediaItem } from "./upload-media-file";
import { toDemoMediaItem } from "./demo/media-registry";
import type { DemoMediaItem } from "./demo/media-items";

const PublicMediaContext = createContext<Map<string, DemoMediaItem> | null>(null);

export function PublicMediaProvider({ items, children }: { items: UploadedMediaItem[]; children: ReactNode }) {
  const media = useMemo(() => new Map(items.map((item, index) => [item.id, toDemoMediaItem(item, index)])), [items]);
  return <PublicMediaContext.Provider value={media}>{children}</PublicMediaContext.Provider>;
}

export function useInitialPublicMedia() {
  return useContext(PublicMediaContext);
}
