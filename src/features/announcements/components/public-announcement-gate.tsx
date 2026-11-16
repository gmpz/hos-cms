"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type SyntheticEvent } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { PublicAnnouncement } from "@/features/announcements/types";
import { RichText } from "@/features/pages/blocks/renderers/rich-text";
import { announcementContentDocument } from "@/features/announcements/announcement-content";

type Props = { announcements: PublicAnnouncement[]; pathname: string; showAnnouncements: boolean };
const appearanceDelayMs = 400;
const pageLoadingSelector = "[data-public-page-loading]";
const acknowledgedInDocument = new Set<string>();

function announcementKey(item: PublicAnnouncement) {
  return `${item.id}:${item.modalCookieVersion}`;
}

function hasVisiblePageLoading() {
  return Array.from(document.querySelectorAll<HTMLElement>(pageLoadingSelector))
    .some((element) => element.getClientRects().length > 0);
}

function AnnouncementDialog({ item, position, total, onDismiss }: { item: PublicAnnouncement; position: number; total: number; onDismiss: (showNext: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const attentionAnimation = useRef<Animation | null>(null);
  const busyRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [suppressionSelection, setSuppressionSelection] = useState<{ id: string; checked: boolean } | null>(null);
  const canSuppress = item.modalFrequency !== "ONCE_PER_CAMPAIGN";
  const suppress = canSuppress && suppressionSelection?.id === item.id && suppressionSelection.checked;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      attentionAnimation.current?.cancel();
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, [item.id]);

  async function dismiss(showNext = true): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setPending(true);
    setError("");
    const form = new FormData();
    form.set("id", item.id);
    form.set("version", String(item.modalCookieVersion));
    form.set("displayMode", "MODAL");
    if (suppress) form.set("suppress", "1");
    try {
      const response = await fetch("/api/announcements/dismiss", {
        method: "POST", body: form, headers: { Accept: "application/json" }, cache: "no-store",
      });
      if (!response.ok) throw new Error("บันทึกการปิดประกาศไม่สำเร็จ กรุณาลองอีกครั้ง");
      if (showNext && position < total) {
        if (dialogRef.current) dialogRef.current.scrollTop = 0;
      } else {
        dialogRef.current?.close();
      }
      onDismiss(showNext);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง");
      return false;
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    void dismiss();
  }

  function refocusDialog(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    dialogRef.current?.focus({ preventScroll: true });
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    attentionAnimation.current?.cancel();
    attentionAnimation.current = card.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.02)", offset: 0.45 },
      { transform: "scale(1)" },
    ], { duration: 320, easing: "ease-out" });
  }

  async function followLink(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const popup = item.openInNewTab ? window.open("about:blank", "_blank") : null;
    if (popup) popup.opener = null;
    if (await dismiss(false)) {
      if (popup) popup.location.href = item.buttonUrl;
      else window.location.assign(item.buttonUrl);
    } else popup?.close();
  }

  return <dialog ref={dialogRef} className={`announcement-dialog mode-${item.contentMode.toLowerCase()}`}
    aria-labelledby={`announcement-dialog-title-${item.id}`} tabIndex={-1} onCancel={onCancel} onClick={refocusDialog}>
    <div ref={cardRef} key={item.id} className="announcement-dialog-card">
      <header className="announcement-dialog-header">
        <h2 id={`announcement-dialog-title-${item.id}`} aria-live="polite">{item.title}</h2>
        <button type="button" className="announcement-dialog-close" aria-label="ปิดประกาศนี้" disabled={pending} onClick={() => void dismiss()}><X size={20}/></button>
      </header>
      <div className="announcement-dialog-body">
        {total > 1 ? <div className="announcement-dialog-position" aria-label={`ประกาศ ${position} จาก ${total}`}>{position} / {total}</div> : null}
        {item.contentMode === "IMAGE" && item.imageUrl ? /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.imageUrl} alt={item.imageAlt} /> : null}
        {item.contentMode === "TEXT" ? <RichText content={announcementContentDocument(item.description)} /> : null}
      </div>
      <footer className="announcement-dialog-footer">
        {canSuppress ? <label className="announcement-dialog-suppress">
          <input type="checkbox" checked={suppress} disabled={pending}
            onChange={(event) => setSuppressionSelection({ id: item.id, checked: event.target.checked })} />
          <span>ไม่แสดงประกาศนี้อีก</span>
        </label> : null}
        <div className="announcement-dialog-actions">
          {item.buttonUrl ? <a className="announcement-dialog-link" href={item.buttonUrl} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined}
            onClick={(event) => void followLink(event)}><span>{item.buttonLabel}</span>{item.openInNewTab ? <ArrowUpRight size={16}/> : null}</a> : null}
          <button type="button" className="announcement-dialog-acknowledge" disabled={pending} onClick={() => void dismiss()}>{pending ? "กำลังดำเนินการ..." : position < total ? "ถัดไป" : "รับทราบ"}</button>
        </div>
      </footer>
      {error ? <p className="announcement-dialog-error" role="alert">{error}</p> : null}
    </div>
  </dialog>;
}

export function PublicAnnouncementGate({ announcements, pathname, showAnnouncements }: Props) {
  const [index, setIndex] = useState(0);
  const [readyPath, setReadyPath] = useState<string | null>(null);
  const items = useMemo(() => announcements.filter((candidate) => candidate.displayMode === "MODAL"), [announcements]);
  useEffect(() => {
    if (!showAnnouncements || items.length === 0) return;
    let firstFrame = 0;
    let secondFrame = 0;
    let timer = 0;
    const cancelPending = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timer);
      firstFrame = 0;
      secondFrame = 0;
      timer = 0;
    };
    const schedule = () => {
      if (hasVisiblePageLoading()) {
        cancelPending();
        return;
      }
      if (firstFrame || secondFrame || timer) return;
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          if (hasVisiblePageLoading()) return;
          timer = window.setTimeout(() => {
            timer = 0;
            if (hasVisiblePageLoading()) return;
            observer.disconnect();
            setIndex((current) => {
              let next = current;
              while (next < items.length && acknowledgedInDocument.has(announcementKey(items[next]))) next++;
              return next;
            });
            setReadyPath(pathname);
          }, appearanceDelayMs);
        });
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style"] });
    schedule();
    return () => {
      observer.disconnect();
      cancelPending();
    };
  }, [showAnnouncements, items, pathname]);
  if (!showAnnouncements || readyPath !== pathname) return null;
  const item = items[index];
  return item ? <AnnouncementDialog item={item} position={index + 1} total={items.length}
    onDismiss={(showNext) => {
      acknowledgedInDocument.add(announcementKey(item));
      setIndex((current) => {
        if (!showNext) return items.length;
        let next = current + 1;
        while (next < items.length && acknowledgedInDocument.has(announcementKey(items[next]))) next++;
        return next;
      });
    }} /> : null;
}
