"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { resolveLinkTarget, type LinkTargetCatalog } from "./resolve-link-target";
import type { LinkTarget } from "@/types/content";

const LinkTargetCatalogContext = createContext<LinkTargetCatalog | null>(null);

export function LinkTargetCatalogProvider({ catalog, children }: { catalog: LinkTargetCatalog; children: ReactNode }) {
  return <LinkTargetCatalogContext.Provider value={catalog}>{children}</LinkTargetCatalogContext.Provider>;
}

export function useLinkTargetResolver() {
  const catalog = useContext(LinkTargetCatalogContext);
  return useCallback((target: LinkTarget) => resolveLinkTarget(target, catalog ?? undefined), [catalog]);
}
