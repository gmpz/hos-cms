"use client";

import { useEffect, useRef, useState, type IframeHTMLAttributes } from "react";

type PublicEmbedProps = IframeHTMLAttributes<HTMLIFrameElement> & { externalUrl?: string };

export function PublicEmbed(props: PublicEmbedProps) {
  return <Embed key={props.src} {...props}/>;
}

function Embed({ externalUrl, ...props }: PublicEmbedProps) {
  const [status, setStatus] = useState<"pending" | "ready" | "slow" | "error">("pending");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // A lazy iframe may stay unloaded while it is offscreen, so start the timer near the viewport.
  useEffect(() => {
    let timer: number | undefined;
    const startTimer = () => {
      if (timer === undefined) timer = window.setTimeout(() => setStatus((current) => current === "pending" ? "slow" : current), 15000);
    };
    const iframe = iframeRef.current;
    if (!iframe || !("IntersectionObserver" in window)) {
      startTimer();
      return () => { if (timer !== undefined) window.clearTimeout(timer); };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { startTimer(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(iframe);
    return () => { observer.disconnect(); if (timer !== undefined) window.clearTimeout(timer); };
  }, []);
  return <div className={`public-embed ${props.className ?? ""}`}>
    <iframe {...props} ref={iframeRef} onLoad={() => setStatus("ready")} onError={() => setStatus("error")}/>
    {status === "pending" ? <span className="public-embed-skeleton public-loading-shape" role="status" aria-label="กำลังโหลดเนื้อหา"/> : null}
    {status === "slow" || status === "error" ? <div className="public-embed-fallback" role="status"><span>{status === "slow" ? "เนื้อหานี้ใช้เวลาโหลดนาน" : "ไม่สามารถโหลดเนื้อหานี้ได้"}</span><a href={externalUrl ?? props.src} target="_blank" rel="noopener noreferrer">เปิดในแท็บใหม่</a></div> : null}
  </div>;
}
