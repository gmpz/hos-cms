"use client";

import { useEffect, useState } from "react";

export function SearchResultsLoading() {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSkeleton(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="site-search-results-loading" role="status" aria-live="polite" aria-label="กำลังค้นหาข้อมูล">
    {showSkeleton ? <div className="site-search-skeleton" aria-hidden="true">
      <span className="site-search-skeleton-count"/>
      <div className="site-search-skeleton-tabs"><span/><span/><span/><span/></div>
      <span className="site-search-skeleton-heading"/>
      <div className="site-search-skeleton-list">{Array.from({ length: 3 }, (_, index) => <div key={index}><span/><span/></div>)}</div>
    </div> : null}
    <span className="site-search-visually-hidden">กำลังค้นหาข้อมูล…</span>
  </div>;
}
