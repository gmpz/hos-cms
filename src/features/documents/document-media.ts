import type { DemoDocument } from "./demo/model";
import { toDemoMediaItem } from "@/features/media/demo/media-registry";

export function documentMedia(document: DemoDocument) {
  return document.media ? toDemoMediaItem(document.media) : null;
}
