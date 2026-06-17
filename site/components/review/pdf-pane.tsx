"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Worker must match react-pdf's bundled pdfjs version exactly.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A pdf.js-rendered PDF with page navigation + in-document text search that
 *  scrolls to each matched highlight. `page` scrolls the view; `query`
 *  pre-fills the find box (e.g. the active EVD's quote). */
export function PdfPane({
  citekey,
  page,
  query,
}: {
  citekey: string;
  page?: number;
  query?: string;
}) {
  const file = useMemo(
    () => `/api/pdf/${encodeURIComponent(citekey)}`,
    [citekey],
  );
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(640);
  const [find, setFind] = useState("");
  const [markIdx, setMarkIdx] = useState(0);
  const [markCount, setMarkCount] = useState(0);
  const [renderTick, setRenderTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingScroll = useRef(false);

  const getMarks = () =>
    Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(".textLayer mark") ??
        [],
    );

  const focusMark = (i: number) => {
    const marks = getMarks();
    marks.forEach((m) => m.classList.remove("pdf-hl-active"));
    const el = marks[i];
    if (el) {
      el.classList.add("pdf-hl-active");
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  // pre-fill find when the active EVD changes (strip leading quote/citation noise)
  useEffect(() => {
    if (query) {
      const clean = query.replace(/^[">\s]+/, "").replace(/\s+/g, " ");
      setFind(clean.slice(0, 50));
    }
  }, [query]);

  // size pages to the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth - 24));
    ro.observe(el);
    setWidth(el.clientWidth - 24);
    return () => ro.disconnect();
  }, []);

  // explicit page jump (EVD has no matching highlight, or no query)
  useEffect(() => {
    if (!page) return;
    pageRefs.current[page - 1]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [page, numPages]);

  // a new query: reset index and request a scroll-to-first once marks render
  useEffect(() => {
    setMarkIdx(0);
    pendingScroll.current = find.trim().length >= 2;
  }, [find]);

  // recount marks whenever the query or a text layer (re)renders; scroll to the
  // first match the first time it appears for a new query
  useEffect(() => {
    const marks = getMarks();
    setMarkCount(marks.length);
    if (pendingScroll.current && marks.length) {
      pendingScroll.current = false;
      focusMark(0);
    }
  }, [find, renderTick]);

  const textRenderer = useMemo(() => {
    const q = find.trim();
    if (q.length < 2) return undefined;
    let re: RegExp;
    try {
      re = new RegExp(`(${escapeRegExp(q)})`, "gi");
    } catch {
      return undefined;
    }
    return ({ str }: { str: string }) => str.replace(re, "<mark>$1</mark>");
  }, [find]);

  const step = (dir: 1 | -1) => {
    if (!markCount) return;
    const next = (markIdx + dir + markCount) % markCount;
    setMarkIdx(next);
    focusMark(next);
  };

  return (
    <div className="flex min-h-0 flex-col">
      {/* find toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="Find in document…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {find && (
          <>
            <span className="font-mono text-[11px] text-muted-foreground">
              {markCount ? `${markIdx + 1}/${markCount}` : "no match"}
            </span>
            <button
              onClick={() => step(-1)}
              disabled={!markCount}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Previous match"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => step(1)}
              disabled={!markCount}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Next match"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setFind("")}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* pages */}
      <div
        ref={containerRef}
        className="review-pdf min-h-0 flex-1 overflow-y-auto bg-muted/20 px-3 py-3"
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <p className="p-6 text-center text-sm text-muted-foreground">
              Loading PDF…
            </p>
          }
          error={
            <p className="p-6 text-center text-sm text-muted-foreground">
              PDF not available locally for {citekey}.
            </p>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              className="mx-auto mb-3 w-fit shadow-sm"
            >
              <Page
                pageNumber={i + 1}
                width={width}
                customTextRenderer={textRenderer}
                onRenderTextLayerSuccess={() => setRenderTick((t) => t + 1)}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
