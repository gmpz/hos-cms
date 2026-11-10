"use client";
import { useEffect } from "react";
import { refreshUnits } from "../demo/storage";

export function UnitBootstrap({ includeDrafts = false }: { includeDrafts?: boolean }) {
  useEffect(() => { void refreshUnits(includeDrafts).catch(() => undefined); }, [includeDrafts]);
  return null;
}
