"use client";

import type { ReactNode } from "react";
import type { UploadedMediaItem } from "./upload-media-file";
import { seedDemoMediaItems } from "./demo/media-registry";

/** Make the current route's resolved references available during server rendering. */
export function RouteMedia({ items, children }: { items: UploadedMediaItem[]; children: ReactNode }) {
  seedDemoMediaItems(items);
  return children;
}

