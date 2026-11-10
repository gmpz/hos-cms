"use client";

import { useSyncExternalStore } from "react";

const storageKey = "hos-cms:admin-sidebar-collapsed";
const changeEvent = "hos-cms:admin-sidebar-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEvent, callback);
  };
}

function snapshot() {
  return window.localStorage.getItem(storageKey) === "true";
}

export function useSidebarCollapse() {
  const collapsed = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggleCollapsed() {
    window.localStorage.setItem(storageKey, String(!collapsed));
    window.dispatchEvent(new Event(changeEvent));
  }
  return { collapsed, toggleCollapsed };
}
