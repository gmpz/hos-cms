import type { DemoMediaItem } from "@/features/media/demo/media-items";
import { mediaPreviewStyle } from "@/features/media/demo/media-registry";
import type { DemoPost } from "@/features/pages/demo/data";
import { newsCoverDisplayStyle } from "../cover-display";

export function NewsCoverImage({ post, media, src }: {
  post: Pick<DemoPost, "coverFit" | "coverFocus" | "coverZoom">;
  media?: DemoMediaItem;
  src?: string;
}) {
  const sourceStyle = media ? mediaPreviewStyle(media) : src ? { backgroundImage: `url("${src}")` } : undefined;
  if (!sourceStyle) return null;
  return <>
    {post.coverFit === "contain" ? <span className="news-cover-image-backdrop" style={sourceStyle} aria-hidden="true" /> : null}
    <span className="news-cover-image-layer" style={{ ...sourceStyle, ...newsCoverDisplayStyle(post) }} aria-hidden="true" />
  </>;
}
