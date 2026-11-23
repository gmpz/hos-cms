"use client";

import { useEffect, useRef, useState } from "react";
import type { RenderTask } from "pdfjs-dist";

export function PdfMediaThumbnail({ url, name, cover = false }: { url: string; name: string; cover?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "150px" });
    observer.observe(container);
    const resize = new ResizeObserver(() => setSize({ width: container.clientWidth, height: container.clientHeight }));
    resize.observe(container);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);

  useEffect(() => {
    if (!visible || !size.width || !size.height) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let loadingTask: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | null = null;
    void import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      loadingTask = pdfjs.getDocument({ url });
      const document = await loadingTask.promise;
      if (cancelled) return;
      const page = await document.getPage(1);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = cover
        ? Math.max(size.width / base.width, size.height / base.height)
        : Math.min(size.width / base.width, size.height / base.height);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { alpha: false });
      if (!canvas || !context) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await renderTask.promise;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [url, visible, size.width, size.height, cover]);

  return <div ref={containerRef} className="pdf-media-thumbnail"><canvas ref={canvasRef} role="img" aria-label={`ตัวอย่าง PDF ${name}`} /></div>;
}
