"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

function PdfPage({ document, number, width, scrollRoot }: {
  document: PDFDocumentProxy;
  number: number;
  width: number;
  scrollRoot: HTMLDivElement | null;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [renderedWidth, setRenderedWidth] = useState(0);
  const [failedWidth, setFailedWidth] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (!scrollRoot || !window.IntersectionObserver) {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { root: scrollRoot, rootMargin: "300px" });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!visible || width <= 0) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    const render = async () => {
      const page = await document.getPage(number);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      if (wrapperRef.current) wrapperRef.current.style.aspectRatio = `${base.width} / ${base.height}`;
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { alpha: false });
      if (!canvas || !context) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      task = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      await task.promise;
      if (!cancelled) setRenderedWidth(width);
    };
    void render().catch(() => { if (!cancelled) setFailedWidth(width); });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [document, number, visible, width]);

  return <div className="pdf-viewer-mobile-page" ref={wrapperRef} style={{ width }}>
    {renderedWidth !== width && failedWidth !== width ? <span className="pdf-page-skeleton public-loading-shape" role="status" aria-label={`กำลังโหลดหน้า ${number}`}/> : null}
    {failedWidth === width ? <p role="alert">ไม่สามารถแสดงหน้านี้ได้</p> : null}
    <canvas ref={canvasRef} aria-label={`หน้า ${number}`} role="img" />
  </div>;
}

function PdfPages({ url, title }: { url: string; title: string }) {
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const pageWidth = Math.round(width * zoom);

  const goToPage = (page: number) => {
    if (!scrollRoot || !document || page < 1 || page > document.numPages) return;
    const target = scrollRoot.querySelectorAll<HTMLElement>(".pdf-viewer-mobile-page")[page - 1];
    if (!target) return;
    scrollRoot.scrollTo({
      top: scrollRoot.scrollTop + target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top - 12,
      behavior: "smooth",
    });
    setCurrentPage(page);
  };

  const updateCurrentPage = () => {
    if (!scrollRoot) return;
    const top = scrollRoot.getBoundingClientRect().top;
    const pages = scrollRoot.querySelectorAll<HTMLElement>(".pdf-viewer-mobile-page");
    let closest = 0;
    let distance = Infinity;
    pages.forEach((page, index) => {
      const nextDistance = Math.abs(page.getBoundingClientRect().top - top - 12);
      if (nextDistance < distance) {
        closest = index;
        distance = nextDistance;
      }
    });
    if (pages.length) setCurrentPage(closest + 1);
  };

  useEffect(() => {
    const root = scrollRoot;
    if (!root) return;
    const update = () => setWidth(Math.max(0, Math.floor(root.clientWidth - 24)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    let mounted = true;
    let loadingTask: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | null = null;
    void import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      loadingTask = pdfjs.getDocument({ url });
      const loaded = await loadingTask.promise;
      if (mounted) setDocument(loaded);
    }).catch(() => {
      if (mounted) setFailed(true);
    });
    return () => {
      mounted = false;
      void loadingTask?.destroy();
    };
  }, [url]);

  return <>
    <div className="pdf-viewer-mobile-toolbar" role="toolbar" aria-label="เครื่องมืออ่าน PDF">
      <strong className="pdf-viewer-mobile-title" title={title}>{title}</strong>
      <div className="pdf-viewer-mobile-actions">
        <a href={url} download title="ดาวน์โหลด PDF" aria-label="ดาวน์โหลด PDF"><Download size={17}/></a>
        <a href={url} target="_blank" rel="noopener noreferrer" title="เปิด PDF ในแท็บใหม่" aria-label="เปิด PDF ในแท็บใหม่"><ExternalLink size={17}/></a>
      </div>
      <div className="pdf-viewer-mobile-controls">
        <div className="pdf-viewer-mobile-pages-control">
          <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={!document || currentPage <= 1} aria-label="หน้าก่อนหน้า" title="หน้าก่อนหน้า"><ChevronLeft size={19}/></button>
          <span>{currentPage} / {document?.numPages ?? "–"}</span>
          <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={!document || currentPage >= document.numPages} aria-label="หน้าถัดไป" title="หน้าถัดไป"><ChevronRight size={19}/></button>
        </div>
        <div className="pdf-viewer-mobile-zoom">
          <button type="button" onClick={() => setZoom((value) => Math.max(.75, Math.round((value - .25) * 100) / 100))} disabled={zoom <= .75} aria-label="ย่อ PDF" title="ย่อ PDF"><Minus size={17}/></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(2, Math.round((value + .25) * 100) / 100))} disabled={zoom >= 2} aria-label="ขยาย PDF" title="ขยาย PDF"><Plus size={17}/></button>
        </div>
      </div>
    </div>
    <div className="pdf-viewer-mobile-pages" ref={setScrollRoot} onScroll={updateCurrentPage}>
      {failed ? <p>ไม่สามารถแสดง PDF ได้ <a href={url} target="_blank" rel="noopener noreferrer">เปิดไฟล์ PDF</a></p> : null}
      {!failed && !document ? <div className="pdf-document-skeleton public-loading-shape" role="status" aria-label="กำลังโหลด PDF"/> : null}
      {document && pageWidth > 0 ? Array.from({ length: document.numPages }, (_, index) => (
        <PdfPage key={index + 1} document={document} number={index + 1} width={pageWidth} scrollRoot={scrollRoot} />
      )) : null}
    </div>
  </>;
}

export function ResponsivePdfEmbed({ url, title }: { url: string; title: string }) {
  return <div className="pdf-viewer-embed">
    <PdfPages key={url} url={url} title={title} />
  </div>;
}
