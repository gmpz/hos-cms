"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Summary = { visits: number; asOf: string };

export function PublicVisitTotal() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let controller: AbortController;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      void fetch("/api/analytics/summary", { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unavailable");
          const data: unknown = await response.json();
          if (!data || typeof data !== "object" || !("visits" in data) || !("asOf" in data) ||
            typeof data.visits !== "number" || !Number.isSafeInteger(data.visits) || data.visits < 0 ||
            typeof data.asOf !== "string" || !Number.isFinite(Date.parse(data.asOf))) throw new Error("Invalid summary");
          setSummary({ visits: data.visits, asOf: data.asOf });
          setFailed(false);
        }).catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setFailed(true);
        });
    };
    refresh();
    window.addEventListener("hos-visit-recorded", refresh);
    return () => { controller?.abort(); window.removeEventListener("hos-visit-recorded", refresh); };
  }, []);

  const count = summary ? summary.visits.toLocaleString("th-TH") : "—";
  return <div className="public-footer-visits">
    <div className="public-footer-visits-content">
      <p className="public-footer-visits-label">จำนวนการเข้าชมสะสม (ครั้ง)</p>
      <p className="public-footer-visits-value" style={{ "--visit-count-characters": Math.max(9, count.length) } as CSSProperties}><strong>{count}</strong></p>
      <small>{summary ? <>ข้อมูล ณ วันที่ <time dateTime={summary.asOf}>{new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(summary.asOf))}</time></> : failed ? "ยังไม่สามารถโหลดสถิติได้" : "กำลังโหลดสถิติ…"}</small>
    </div>
  </div>;
}
