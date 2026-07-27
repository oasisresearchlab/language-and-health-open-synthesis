"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Pencil,
  X,
  Minus,
  RefreshCw,
  Info,
  Crosshair,
  Download,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";

import type {
  AccuracyPaper,
  AccuracyEvd,
  Quote,
  QuoteRegion,
  Rect,
} from "@/lib/review-accuracy";
import {
  loadReviews,
  saveReview,
  type Reviewer,
  type ReviewMap,
  type ReviewRow,
} from "@/lib/accuracy-store";
import dynamic from "next/dynamic";

import { useReviewer, NotOnRosterGate, IdentityBar } from "@/components/review/identity";
import { ReviewButton, ReviewToggle, type ReviewTone } from "@/components/review/controls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { searchSnippet, figureLabel } from "@/lib/review-search";
import { cn } from "@/lib/utils";

// pdf.js touches DOMMatrix at module load → must not render on the server.
const PdfPane = dynamic(
  () => import("@/components/review/pdf-pane").then((m) => m.PdfPane),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading PDF viewer…
      </div>
    ),
  },
);

/** Fast (provider delay 150ms) tooltip wrapper — replaces slow native title=. */
function Tip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

type Verdict = "ok" | "edit" | "wrong" | "missing" | "na";

const HINTS: Record<string, string> = {
  verbatim:
    "Is the quote the right sentence and does it match the PDF? (An audit checked the string; you confirm the meaning.)",
  substantive:
    "Faithful to the source — direction/magnitude/significance/CI for quantitative results, and an accurate characterization for qualitative ones.",
  grounding: "Correct figure/table embedded — or correctly none.",
};

// First accuracy pass — judge only EVD faithfulness to the source.
// Claim polarity and methods context are deferred to a later review pass.
const REQUIRED_DIMS = ["verbatim", "substantive", "grounding"];

const k = (nodeId: string, dim: string) => `${nodeId}:${dim}`;

export function AccuracyPane({ paper }: { paper: AccuracyPaper }) {
  const { reviewer, notOnRoster, ready, signOut } = useReviewer();
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(paper.evds.find((e) => e.page)?.page ?? 1);
  const [search, setSearch] = useState({ q: "", n: 0 });
  const [highlight, setHighlight] = useState<{
    page: number;
    rects: Rect[];
    n: number;
  } | null>(null);
  // Below lg the two panes don't fit side by side, so only one shows at a time.
  // Any "locate" action flips to the document so the highlight is actually seen.
  const [mobileView, setMobileView] = useState<"review" | "pdf">("review");

  const runSearch = (q: string) => {
    if (q.trim().length >= 2) setSearch((s) => ({ q: q.trim(), n: s.n + 1 }));
    setMobileView("pdf");
  };
  const locateRegion = (region: QuoteRegion) => {
    setPage(region.page);
    setHighlight((h) => ({ page: region.page, rects: region.rects, n: (h?.n ?? 0) + 1 }));
    setMobileView("pdf");
  };
  // a grounded quote/figure: draw its exact precomputed region; else fall back to search
  const locateQuote = (q: Quote) =>
    q.region ? locateRegion(q.region) : runSearch(searchSnippet(q.text));
  const locateFigure = (evd: AccuracyEvd, label: string) =>
    evd.imageRegion ? locateRegion(evd.imageRegion) : runSearch(label);

  useEffect(() => {
    if (!reviewer) return;
    setLoaded(false);
    loadReviews(reviewer.id, paper.citekey).then((m) => {
      setReviews(m);
      setLoaded(true);
    });
  }, [reviewer, paper.citekey]);

  const setCell = (nodeId: string, dim: string, patch: Partial<ReviewRow>) => {
    setReviews((r) => {
      const key = k(nodeId, dim);
      const row: ReviewRow = {
        ...r[key],
        ...patch,
        node_id: nodeId,
        dimension: dim,
      };
      const next = { ...r, [key]: row };
      if (reviewer) void saveReview(reviewer, paper.citekey, row, next);
      return next;
    });
  };

  const meter = useMemo(() => {
    let doneEvds = 0;
    for (const e of paper.evds) {
      if (REQUIRED_DIMS.every((d) => reviews[k(e.id, d)]?.verdict)) doneEvds++;
    }
    const flags = Object.values(reviews).filter((r) =>
      ["edit", "wrong", "missing"].includes(r.verdict ?? ""),
    ).length;
    return { doneEvds, total: paper.evds.length, flags };
  }, [reviews, paper.evds]);

  function exportJson() {
    const out = {
      citekey: paper.citekey,
      title: paper.title,
      reviewer: reviewer?.name,
      reviewedAt: new Date().toISOString(),
      meter,
      reviews: Object.values(reviews),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accuracy-${paper.citekey.replace(/^@/, "")}-${reviewer?.name ?? "anon"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return null;
  if (notOnRoster) return <NotOnRosterGate onSignOut={signOut} />;
  if (!reviewer) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Below lg the panes don't fit side by side — switch between them. */}
      {paper.hasPdf && (
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-3 py-1.5 lg:hidden">
          <span className="mr-1 text-[11px] text-muted-foreground">View</span>
          <ReviewToggle
            pressed={mobileView === "review"}
            tone="primary"
            onClick={() => setMobileView("review")}
            className="px-3 py-1 text-xs"
          >
            Review
          </ReviewToggle>
          <ReviewToggle
            pressed={mobileView === "pdf"}
            tone="primary"
            onClick={() => setMobileView("pdf")}
            className="px-3 py-1 text-xs"
          >
            Document
          </ReviewToggle>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden lg:grid-cols-[1.1fr_1fr]">
        {/* Left — PDF (pdf.js: in-doc search + highlight) */}
        <div
          className={cn(
            "min-h-0 flex-col overflow-hidden border-r border-border lg:flex",
            mobileView === "pdf" ? "flex" : "hidden",
          )}
        >
          {paper.hasPdf ? (
          <PdfPane
            citekey={paper.citekey}
            page={page}
            search={search}
            highlight={highlight ?? undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            PDF not available locally for {paper.citekey}.
          </div>
        )}
      </div>

        {/* Right — per-EVD checklist */}
        <div
          className={cn(
            "min-h-0 flex-col overflow-hidden lg:flex",
            mobileView === "review" ? "flex" : "hidden",
          )}
        >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-muted/30 px-4 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">EVDs reviewed</span>
            <span
              className={cn(
                "font-mono tabular-nums",
                meter.doneEvds === meter.total && meter.total > 0
                  ? "text-primary"
                  : "text-foreground",
              )}
            >
              {meter.doneEvds}/{meter.total}
            </span>
          </span>
          {meter.flags > 0 && (
            <span className="font-mono text-verdict-edit">
              {meter.flags} flagged
            </span>
          )}
          <a
            href="/review/guide"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" /> Review criteria
          </a>
          <IdentityBar reviewer={reviewer} onSignOut={signOut} />
          <ReviewButton
            onClick={exportJson}
            className="ml-auto h-7 border border-border px-2 font-mono text-[11px] hover:bg-accent/50"
          >
            <Download className="h-3 w-3" /> Export
          </ReviewButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {!loaded ? (
            <p className="text-sm text-muted-foreground">Loading your reviews…</p>
          ) : (
            <ul className="space-y-5">
              {paper.evds.map((evd, i) => (
                <EvdCard
                  key={evd.id}
                  evd={evd}
                  index={i + 1}
                  reviews={reviews}
                  onLocateQuote={locateQuote}
                  onLocateFigure={(label) => locateFigure(evd, label)}
                  onSet={(dim, patch) => setCell(evd.id, dim, patch)}
                />
              ))}
            </ul>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function EvdCard({
  evd,
  index,
  reviews,
  onLocateQuote,
  onLocateFigure,
  onSet,
}: {
  evd: AccuracyEvd;
  index: number;
  reviews: ReviewMap;
  onLocateQuote: (q: Quote) => void;
  onLocateFigure: (label: string) => void;
  onSet: (dim: string, patch: Partial<ReviewRow>) => void;
}) {
  const allDone = REQUIRED_DIMS.every((d) => reviews[k(evd.id, d)]?.verdict);
  const judge = (dim: string) => (
    <Judge
      dim={dim}
      row={reviews[k(evd.id, dim)]}
      onSet={(patch) => onSet(dim, patch)}
    />
  );
  const fig = figureLabel(evd.image);

  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        allDone ? "border-primary/40 bg-primary/[0.03]" : "border-border",
      )}
    >
      {/* heading */}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground">
          {index}.{" "}
          <Tip content="Open this evidence node in context">
            <a
              href={`/node/${evd.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {evd.id}
              <ArrowUpRight className="ml-0.5 inline h-3 w-3 opacity-60" />
            </a>
          </Tip>
        </span>
        <h2 className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {evd.title}
        </h2>
        {evd.page && (
          <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground">
            p{evd.page}
          </span>
        )}
      </div>

      {/* Evidence & quote — each quote has its own locate button + judged here */}
      <Section title="Evidence & quote">
        {evd.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {evd.description}
          </p>
        )}
        {evd.quotes.length ? (
          evd.quotes.map((q, qi) => (
            <QuoteRow key={qi} quote={q} onLocate={() => onLocateQuote(q)} />
          ))
        ) : (
          <p className="mt-1 text-[11px] italic text-verdict-edit">
            No grounding quote — search the PDF to suggest one, or flag
            &ldquo;missing&rdquo;.
          </p>
        )}
        <JudgeBar>
          {judge("verbatim")}
          {judge("substantive")}
        </JudgeBar>
      </Section>

      {/* Grounding figure/table — locate its caption in the PDF */}
      <Section title="Grounding">
        {evd.image ? (
          <div className="flex items-start gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evd.image}
              alt=""
              className="max-h-44 min-w-0 flex-1 rounded border border-border object-contain"
            />
            {fig && (
              <LocateBtn
                onClick={() => onLocateFigure(fig)}
                exact={evd.imageRegion !== null}
              />
            )}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            No figure/table embedded.
          </p>
        )}
        <JudgeBar>{judge("grounding")}</JudgeBar>
      </Section>

      {/* Other notes (display only) */}
      {evd.otherNotes && (
        <Section title="Synthesis note">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {evd.otherNotes}
          </p>
        </Section>
      )}

      {/* Caveats (display only) */}
      {evd.caveats.length > 0 && (
        <Section title="Caveats">
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {evd.caveats.map((c, ci) => (
              <li key={ci} className="flex gap-1">
                <span className="text-verdict-edit">⚑</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <NoteRow
        row={reviews[k(evd.id, "_node")]}
        onSet={(patch) => onSet("_node", patch)}
      />
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** A small "find this in the PDF" button. `exact` = we have precomputed coords. */
function LocateBtn({
  onClick,
  exact = false,
}: {
  onClick: () => void;
  exact?: boolean;
}) {
  return (
    <Tip
      content={
        exact ? "Highlight this exact passage in the PDF" : "Find this in the PDF"
      }
    >
      <ReviewButton
        onClick={onClick}
        aria-label="Find in PDF"
        className={cn(
          "mt-0.5 h-6 w-6 hover:bg-accent/50 hover:text-foreground",
          exact ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Crosshair className="h-3.5 w-3.5" />
      </ReviewButton>
    </Tip>
  );
}

/** A verbatim quote with its own locate-in-PDF button (exact region when available). */
function QuoteRow({ quote, onLocate }: { quote: Quote; onLocate: () => void }) {
  return (
    <div className="mt-1.5 flex items-start gap-1.5">
      <blockquote className="min-w-0 flex-1 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-muted-foreground">
        {quote.text}
      </blockquote>
      <LocateBtn onClick={onLocate} exact={quote.region !== null} />
    </div>
  );
}

/** Right-aligned judgment controls anchored beneath the quote/figure they score. */
function JudgeBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex flex-col items-end gap-1 border-t border-dashed border-border/60 pt-1.5">
      {children}
    </div>
  );
}

const VERDICTS: {
  v: Verdict;
  icon: React.ReactNode;
  tone: ReviewTone;
  title: string;
}[] = [
  {
    v: "ok",
    icon: <Check className="h-3.5 w-3.5" />,
    tone: "correct",
    title: "Correct",
  },
  {
    v: "edit",
    icon: <Pencil className="h-3.5 w-3.5" />,
    tone: "edit",
    title: "Needs an edit — propose the fix",
  },
  {
    v: "wrong",
    icon: <X className="h-3.5 w-3.5" />,
    tone: "wrong",
    title: "Wrong",
  },
  {
    v: "missing",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    tone: "missing",
    title: "Missing — flag for another extraction pass",
  },
  {
    v: "na",
    icon: <Minus className="h-3.5 w-3.5" />,
    tone: "neutral",
    title: "Not applicable",
  },
];

function Judge({
  dim,
  row,
  onSet,
}: {
  dim: string; // dimension for the hint (verbatim|substantive|grounding)
  row?: ReviewRow;
  onSet: (patch: Partial<ReviewRow>) => void;
}) {
  const verdict = row?.verdict as Verdict | undefined;
  const showText = verdict === "edit" || verdict === "wrong" || verdict === "missing";
  const placeholder =
    verdict === "edit"
      ? "Proposed correction…"
      : verdict === "missing"
        ? "What's missing? (queued for re-extraction)"
        : "What's wrong with it?";
  return (
    <div className="w-full">
      <div
        role="group"
        aria-label={`${dim} verdict`}
        className="flex items-center justify-end gap-1"
      >
        <Tip content={HINTS[dim]}>
          <span className="mr-0.5 inline-flex cursor-help items-center gap-1 text-[11px] font-medium capitalize text-foreground">
            {dim}
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </Tip>
        {VERDICTS.map((b) => (
          <Tip key={b.v} content={b.title}>
            <ReviewToggle
              pressed={verdict === b.v}
              tone={b.tone}
              aria-label={b.title}
              onClick={() => onSet({ verdict: verdict === b.v ? null : b.v })}
              className="h-7 w-7 pointer-coarse:h-10 pointer-coarse:w-10"
            >
              {b.icon}
            </ReviewToggle>
          </Tip>
        ))}
      </div>
      {showText && (
        <textarea
          defaultValue={row?.proposed ?? ""}
          onBlur={(e) => onSet({ proposed: e.target.value })}
          rows={2}
          placeholder={placeholder}
          className="mt-1 w-full resize-y rounded border border-border bg-background px-2 py-1 text-xs"
        />
      )}
    </div>
  );
}

function NoteRow({
  row,
  onSet,
}: {
  row?: ReviewRow;
  onSet: (patch: Partial<ReviewRow>) => void;
}) {
  const [open, setOpen] = useState(!!row?.note);
  if (!open) {
    return (
      <ReviewButton
        onClick={() => setOpen(true)}
        className="mt-3 px-1 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        + note on this EVD
      </ReviewButton>
    );
  }
  return (
    <textarea
      defaultValue={row?.note ?? ""}
      onBlur={(e) => onSet({ note: e.target.value })}
      rows={2}
      autoFocus
      placeholder="Anything else about this EVD…"
      className="mt-3 w-full resize-y rounded border border-border bg-background px-2 py-1 text-xs"
    />
  );
}
