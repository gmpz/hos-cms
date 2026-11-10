"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { hydrateDemoMedia, subscribeDemoMedia } from "./demo/media-registry";

const subscribeToHydration = () => () => undefined;

export function useMediaRevision() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [, setRevision] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeDemoMedia(() => setRevision((value) => value + 1));
    void hydrateDemoMedia().catch(() => undefined);
    return unsubscribe;
  }, []);
  return hydrated;
}
