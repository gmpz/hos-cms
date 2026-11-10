"use client";

import { useEffect } from "react";
import { refreshCategories } from "../demo/storage";

export function CategoryBootstrap() {
  useEffect(() => {
    const refresh = () => { void Promise.allSettled([refreshCategories("posts"), refreshCategories("documents")]); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return null;
}
