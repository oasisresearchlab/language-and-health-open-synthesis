"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PagefindUIWindow extends Window {
  PagefindUI?: new (opts: Record<string, unknown>) => unknown;
}

/**
 * Lazy-loads Pagefind's UI bundle on first interaction. Pagefind generates
 * the static index at build time into /pagefind, so during dev (before any
 * build has run) the script will 404 — handled with a graceful message.
 */
export function SearchTrigger() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open || initializedRef.current) return;
    initializedRef.current = true;

    const container = containerRef.current;
    if (!container) return;

    const cssId = "pagefind-ui-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "/pagefind/pagefind-ui.css";
      document.head.appendChild(link);
    }

    const renderError = () => {
      container.innerHTML =
        '<p style="font-size:0.875rem; color:var(--muted-foreground); padding:1.5rem; text-align:center;">' +
        "Search index not built yet. Run <code>pnpm build</code> to generate it." +
        "</p>";
    };

    const attach = () => {
      const ctor = (window as PagefindUIWindow).PagefindUI;
      if (!ctor) {
        renderError();
        return;
      }
      try {
        new ctor({
          element: container,
          showSubResults: true,
          resetStyles: false,
          showImages: false,
          placeholder: "Search nodes…",
        });
      } catch (err) {
        console.warn("[search] pagefind init failed", err);
        renderError();
      }
    };

    if ((window as PagefindUIWindow).PagefindUI) {
      attach();
      return;
    }

    const scriptId = "pagefind-ui-js";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "/pagefind/pagefind-ui.js";
      script.onload = attach;
      script.onerror = renderError;
      document.body.appendChild(script);
    } else {
      attach();
    }
  }, [open]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 font-sans text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-16 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={containerRef} className="p-4" />
          </div>
        </div>
      )}
    </>
  );
}
