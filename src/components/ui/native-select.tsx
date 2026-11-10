"use client";

import { createElement, forwardRef, type SelectHTMLAttributes, useEffect, useState } from "react";

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  { children, className, ...props },
  ref,
) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <select ref={ref} className={["cms-native-select", className].filter(Boolean).join(" ")} {...props}>
      {hydrated ? (
        <button className="native-select-display">{createElement("selectedcontent")}</button>
      ) : null}
      {children}
    </select>
  );
});
