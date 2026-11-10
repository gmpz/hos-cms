import type { EntityId, LinkTarget } from "@/types/content";
import type { NavigationIconName } from "./icon-names";

export interface NavigationLink {
  id: EntityId;
  label: string;
  target: LinkTarget;
  visible: boolean;
  openInNewTab: boolean;
  /** Hide this menu entry from visitors who have not signed in. */
  hideWhenLoggedOut?: boolean;
}
export type NavigationItem =
  | (NavigationLink & { kind: "link"; icon?: NavigationIconName })
  | {
      id: EntityId;
      kind: "dropdown";
      label: string;
      icon?: NavigationIconName;
      visible: boolean;
      /** Hide the whole group from visitors who have not signed in. */
      hideWhenLoggedOut?: boolean;
      /** Defaults to collapsed when navigation saved before this setting existed. */
      defaultExpanded?: boolean;
      children: NavigationLink[];
    };
export interface Navigation {
  home: { label: string };
  items: NavigationItem[];
}
