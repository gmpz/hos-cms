"use client";

import { FileText } from "lucide-react";
import {
  getDemoMediaItem,
  mediaPreviewStyle,
} from "@/features/media/demo/media-registry";
import { useLinkTargetResolver } from "@/features/navigation/link-target-catalog-context";
import type { BlockConfigMap } from "../config/types";
import { SecondaryRichText } from "./secondary-rich-text";
import { NavigationIcon } from "@/features/navigation/navigation-icons";

export function LinkCards({ config }: { config: BlockConfigMap["linkCards"] }) {
  const resolveTarget = useLinkTargetResolver();
  const list = config.presentation === "list";
  return (
    <div className={`link-cards-block presentation-${config.presentation}`}>
      {config.title || config.description ? <header>
        {config.title ? <h2>{config.title}</h2> : null}
        {config.description ? (
          <SecondaryRichText value={config.description} />
        ) : null}
      </header> : null}
      <div className={`link-cards-grid columns-${config.columns}`}>
        {config.items.map((item) => {
          const external = item.target.kind === "external";
          const media =
            item.visual.kind === "image"
              ? getDemoMediaItem(item.visual.mediaId)
              : null;
          return (
            <a
              href={resolveTarget(item.target)}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className={`link-service-card visual-${item.visual.kind}${list ? " list-item" : ""}`}
              key={item.id}
            >
              {list ? null : item.visual.kind === "image" ? (
                <span className={`link-service-image ${media ? "has-image" : ""}`}>
                  {media ? <i style={{
                    ...mediaPreviewStyle(media),
                    backgroundPosition: `${item.visual.focalPoint.x}% ${item.visual.focalPoint.y}%`,
                    transform: `scale(${item.visual.zoom / 100})`,
                    transformOrigin: `${item.visual.focalPoint.x}% ${item.visual.focalPoint.y}%`,
                  }}/> : <FileText size={30} />}
                </span>
              ) : (
                <span className="link-service-icon">
                  <NavigationIcon name={item.visual.icon} size={27} />
                </span>
              )}
              <span className="link-service-body">
                <strong>{item.title}</strong>
                {list ? <span aria-hidden="true">→</span> : null}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
