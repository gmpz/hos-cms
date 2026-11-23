"use client";

import { useEffect, useState } from "react";

export const publicLoadingDelayMs = 180;

// Delay only appearance. Completed requests never wait for an animation.
export function usePublicLoading(pending: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(pending), pending ? publicLoadingDelayMs : 0);
    return () => window.clearTimeout(timer);
  }, [pending]);
  return pending && visible;
}
