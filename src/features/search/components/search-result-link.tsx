"use client";

import { ArrowRight } from "lucide-react";
import { recordDocumentAccess } from "@/features/documents/record-document-access";
import type { SearchItem } from "@/server/search/site-search";

export function SearchResultLink({ item }: { item: SearchItem }) {
  return <a href={item.href} target={item.documentAction === "open" ? "_blank" : undefined} rel={item.documentAction === "open" ? "noopener noreferrer" : undefined} onClick={() => { if (item.documentAction) recordDocumentAccess(item.id, item.documentAction); }}>
    <span><strong>{item.title}</strong>{item.description ? <small>{item.description}</small> : null}</span>
    <ArrowRight size={18} aria-hidden="true"/>
  </a>;
}
