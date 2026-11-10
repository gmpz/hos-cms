"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLinkTargetResolver } from "../link-target-catalog-context";
import { pagesChangeEvent } from "@/features/pages/demo/page-list-storage";
import type { Navigation, NavigationItem, NavigationLink } from "../types";
import { isNavigation } from "../validation";
import { NavigationIcon } from "../navigation-icons";

function isPathActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === href
    : href.startsWith("/") &&
        (pathname === href || pathname.startsWith(`${href}/`));
}

function PublicLink({
  item,
  child = false,
  icon,
}: {
  item: NavigationLink;
  child?: boolean;
  icon?: NavigationItem["icon"];
}) {
  const resolveTarget = useLinkTargetResolver();
  const href = resolveTarget(item.target);
  const pathname = usePathname();
  const active = isPathActive(pathname, href);
  const displayIcon = icon ?? (!child && item.target.kind === "module"
    ? item.target.module === "news" ? "newspaper" : item.target.module === "documents" ? "file-text" : undefined
    : undefined);
  const content = (
    <>
      <span aria-hidden="true">{displayIcon ? <NavigationIcon name={displayIcon} /> : child ? "›" : "○"}</span>
      <b>{item.label}</b>
    </>
  );
  const className = `public-nav-link${child ? " child" : ""}${active ? " active" : ""}`;
  if (item.target.kind === "external")
    return (
      <a
        className={className}
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noreferrer" : undefined}
      >
        {content}
      </a>
    );
  return (
    <Link
      className={className}
      href={href}
      target={item.openInNewTab ? "_blank" : undefined}
    >
      {content}
    </Link>
  );
}

function PublicNavigationGroup({
  item,
  authenticated,
}: {
  item: Extract<NavigationItem, { kind: "dropdown" }>;
  authenticated: boolean;
}) {
  const resolveTarget = useLinkTargetResolver();
  const pathname = usePathname();
  const hasActiveChild = item.children.some(
    (child) => child.visible && isPathActive(pathname, resolveTarget(child.target)),
  );
  const [open, setOpen] = useState(
    () => (item.defaultExpanded ?? false) || hasActiveChild,
  );

  return (
    <details
      className="public-nav-group"
      open={open || hasActiveChild}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span aria-hidden="true">{item.icon ? <NavigationIcon name={item.icon} /> : "▦"}</span>
        <b>{item.label}</b>
        <i aria-hidden="true"><ChevronDown size={16} /></i>
      </summary>
      <div>
        {item.children
          .filter((child) => child.visible && (!child.hideWhenLoggedOut || authenticated))
          .map((child) => (
            <PublicLink key={child.id} item={child} child />
          ))}
      </div>
    </details>
  );
}

export function PublicNavigation({ initialNavigation, initialAuthenticated }: { initialNavigation: Navigation; initialAuthenticated: boolean }) {
  const [navigation, setNavigation] = useState<Navigation>(initialNavigation);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [, setPageRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setPageRevision((value) => value + 1);
    window.addEventListener(pagesChangeEvent, refresh);
    return () => window.removeEventListener(pagesChangeEvent, refresh);
  }, []);
  const pathname = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      void fetch("/api/navigation", { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("โหลดเมนูนำทางไม่สำเร็จ");
          const result: unknown = await response.json();
          if (typeof result !== "object" || result === null || !("navigation" in result) || !isNavigation(result.navigation)) throw new Error("ข้อมูลเมนูไม่ถูกต้อง");
          if (!controller.signal.aborted) {
            setNavigation(result.navigation);
            setAuthenticated("authenticated" in result && result.authenticated === true);
          }
        })
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("hos-navigation-published", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); window.removeEventListener("hos-navigation-published", refresh); };
  }, [pathname]);
  return (
    <nav className="public-nav-list">
      <Link
        className={`public-nav-link${pathname === "/" ? " active" : ""}`}
        href="/"
      >
        <span aria-hidden="true"><NavigationIcon name="house" /></span>
        <b>{navigation.home.label}</b>
      </Link>
      {navigation.items
        .filter((item) => item.visible && (!item.hideWhenLoggedOut || authenticated))
        .map((item) =>
          item.kind === "link" ? (
            <PublicLink key={item.id} item={item} icon={item.icon} />
          ) : <PublicNavigationGroup key={`${item.id}-${item.defaultExpanded ?? false}`} item={item} authenticated={authenticated} />,
        )}
    </nav>
  );
}
