/** Scrolling a menu's own options should not dismiss that menu. */
export function scrollIsInsideMenu(event: Event, menu: Element | null | undefined): boolean {
  return event.target instanceof Node && Boolean(menu?.contains(event.target));
}

/** Dismiss on user-initiated scrolling outside the options, never on layout/focus scroll events. */
export function listenForDropdownDismissal(
  menu: () => Element | null | undefined,
  isInside: (target: EventTarget | null) => boolean,
  dismiss: () => void,
): () => void {
  const onScrollIntent = (event: WheelEvent | TouchEvent) => {
    if (!scrollIsInsideMenu(event, menu())) dismiss();
  };
  const onFocus = (event: FocusEvent) => {
    if (!isInside(event.target)) dismiss();
  };
  const onKey = (event: KeyboardEvent) => {
    if (["PageDown", "PageUp", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key)
      && !isInside(event.target)) dismiss();
  };
  document.addEventListener("wheel", onScrollIntent, true);
  document.addEventListener("touchmove", onScrollIntent, true);
  document.addEventListener("focusin", onFocus);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("wheel", onScrollIntent, true);
    document.removeEventListener("touchmove", onScrollIntent, true);
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("keydown", onKey);
  };
}
