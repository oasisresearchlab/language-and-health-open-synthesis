"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Pencil,
  X,
  Minus,
  RefreshCw,
  Info,
  FileText,
  Download,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";

import type { AccuracyPaper, AccuracyEvd } from "@/lib/review-accuracy";
import {
  loadReviews,
  saveReview,
  type Reviewer,
  type ReviewMap,
  type ReviewRow,
} from "@/lib/accuracy-store";
import dynamic from "next/dynamic";

import { useReviewer, IdentityGate, IdentityBar } from "@/components/review/identity";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  quant:
    "Direction, magnitude, significance, and confidence intervals faithful to the source.",
  grounding: "Correct figure/table embedded — or correctly none.",
  methods:
    "What (the observable) / How (design) / Who (sample) accurately describe the study.",
  polarity:
    "Does this evidence really support / oppose this specific claim, as stated?",
};

// dimension keys: verbatim | quant | grounding | methods | polarity:<claimId>
const k = (nodeId: string, dim: string) => `${nodeId}:${dim}`;

function polarityKeys(evd: AccuracyEvd): string[] {
  return evd.claims.length
    ? evd.claims.map((c) => `polarity:${c.id}`)
    : ["polarity:_none"];
}
function methodKeys(evd: AccuracyEvd): string[] {
  return evd.methods.map((p) => `methods:${p.key}`);
}
function requiredDims(evd: AccuracyEvd): string[] {
  return [
    "verbatim",
    "quant",
    "grounding",
    ...methodKeys(evd),
    ...polarityKeys(evd),
  ];
}

function canonDim(dim: string): string {
  if (dim.startsWith("polarity")) return "polarity";
  if (dim.startsWith("methods")) return "methods";
  return dim;
}

export function AccuracyPane({ paper }: { paper: AccuracyPaper }) {
  const { reviewer, roster, choose, ready } = useReviewer();
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(paper.evds.find((e) => e.page)?.page ?? 1);
  const [query, setQuery] = useState("");

  const jumpTo = (evd: AccuracyEvd) => {
    if (evd.page) setPage(evd.page);
    setQuery(evd.quotes[0] ?? "");
  };

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
      if (requiredDims(e).every((d) => reviews[k(e.id, d)]?.verdict)) doneEvds++;
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
  if (!reviewer) return <IdentityGate roster={roster} onPick={choose} />;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      {/* Left — PDF (pdf.js: in-doc search + highlight) */}
      <div className="hidden min-h-0 flex-col overflow-hidden border-r border-border lg:flex">
        {paper.hasPdf ? (
          <PdfPane citekey={paper.citekey} page={page} query={query} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            PDF not available locally for {paper.citekey}.
          </div>
        )}
      </div>

      {/* Right — per-EVD checklist */}
      <div className="flex min-h-0 flex-col overflow-hidden">
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
            <span className="font-mono text-amber-600 dark:text-amber-400">
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
          <IdentityBar reviewer={reviewer} onSwitch={() => choose(null)} />
          <button
            onClick={exportJson}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[11px] hover:bg-accent/50"
          >
            <Download className="h-3 w-3" /> Export
          </button>
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
                  onJump={evd.page ? () => jumpTo(evd) : undefined}
                  onSet={(dim, patch) => setCell(evd.id, dim, patch)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function polarityBadge(p: "supports" | "opposes") {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        p === "supports"
          ? "bg-primary/10 text-primary"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {p}
    </span>
  );
}

function EvdCard({
  evd,
  index,
  reviews,
  onJump,
  onSet,
}: {
  evd: AccuracyEvd;
  index: number;
  reviews: ReviewMap;
  onJump?: () => void;
  onSet: (dim: string, patch: Partial<ReviewRow>) => void;
}) {
  const allDone = requiredDims(evd).every((d) => reviews[k(evd.id, d)]?.verdict);
  const judge = (dim: string) => (
    <Judge
      dim={canonDim(dim)}
      row={reviews[k(evd.id, dim)]}
      onSet={(patch) => onSet(dim, patch)}
    />
  );

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
          {index}. {evd.id}
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {evd.title}
        </p>
        {onJump && (
          <Tip content="Jump the PDF to this page">
            <button
              onClick={onJump}
              aria-label={`Jump to page ${evd.page}`}
              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3 w-3" /> p{evd.page}
            </button>
          </Tip>
        )}
      </div>

      {/* Evidence & quote — judged right under the grounding quote */}
      <Section title="Evidence & quote">
        {evd.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {evd.description}
          </p>
        )}
        {evd.quotes.length ? (
          evd.quotes.map((q, qi) => (
            <blockquote
              key={qi}
              className="mt-1.5 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-muted-foreground"
            >
              {q}
            </blockquote>
          ))
        ) : (
          <p className="mt-1 text-[11px] italic text-amber-600 dark:text-amber-400">
            No grounding quote — flag &ldquo;missing&rdquo;.
          </p>
        )}
        <JudgeBar>
          {judge("verbatim")}
          {judge("quant")}
        </JudgeBar>
      </Section>

      {/* Grounding figure/table */}
      <Section title="Grounding">
        {evd.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={evd.image}
            alt=""
            className="max-h-44 w-full rounded border border-border object-contain"
          />
        ) : (
          <p className="text-xs italic text-muted-foreground">
            No figure/table embedded.
          </p>
        )}
        <JudgeBar>{judge("grounding")}</JudgeBar>
      </Section>

      {/* Claim links — one judgment per edge */}
      <Section title="Claim link & polarity">
        {evd.claims.length ? (
          <ul className="space-y-2">
            {evd.claims.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                {polarityBadge(c.polarity)}
                <a
                  href={`/node/${c.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {c.title} <ArrowUpRight className="inline h-3 w-3 opacity-60" />
                </a>
                <div className="ml-auto">{judge(`polarity:${c.id}`)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs italic text-muted-foreground">
              Not linked to any claim — should it be?
            </span>
            {judge("polarity:_none")}
          </div>
        )}
      </Section>

      {/* Methods context — each assertion grounded in its own quote + judged */}
      {evd.methods.length > 0 && (
        <Section title="Methods context">
          <ul className="space-y-3">
            {evd.methods.map((p) => (
              <li key={p.key}>
                <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  {p.label}
                </p>
                {p.summary && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.summary}
                  </p>
                )}
                {p.quotes.length ? (
                  p.quotes.map((q, qi) => (
                    <blockquote
                      key={qi}
                      className="mt-1 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-muted-foreground"
                    >
                      {q}
                    </blockquote>
                  ))
                ) : (
                  <p className="mt-0.5 text-[11px] italic text-amber-600 dark:text-amber-400">
                    No grounding quote for this assertion — flag &ldquo;missing&rdquo;.
                  </p>
                )}
                <JudgeBar>{judge(`methods:${p.key}`)}</JudgeBar>
              </li>
            ))}
          </ul>
        </Section>
      )}

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
                <span className="text-amber-600 dark:text-amber-400">⚑</span>
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
      <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="mt-1.5">{children}</div>
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
  tone: string;
  title: string;
}[] = [
  {
    v: "ok",
    icon: <Check className="h-3.5 w-3.5" />,
    tone: "border-primary/50 bg-primary/10 text-primary",
    title: "Correct",
  },
  {
    v: "edit",
    icon: <Pencil className="h-3.5 w-3.5" />,
    tone: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    title: "Needs an edit — propose the fix",
  },
  {
    v: "wrong",
    icon: <X className="h-3.5 w-3.5" />,
    tone: "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    title: "Wrong",
  },
  {
    v: "missing",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    tone: "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    title: "Missing — flag for another extraction pass",
  },
  {
    v: "na",
    icon: <Minus className="h-3.5 w-3.5" />,
    tone: "border-border bg-muted text-muted-foreground",
    title: "Not applicable",
  },
];

function Judge({
  dim,
  row,
  onSet,
}: {
  dim: string; // canonical dimension for the hint (verbatim|quant|grounding|methods|polarity)
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
      <div className="flex items-center justify-end gap-1">
        <Tip content={HINTS[dim]}>
          <span className="mr-0.5 inline-flex cursor-help items-center gap-1 text-[11px] font-medium capitalize text-foreground">
            {dim}
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </Tip>
        {VERDICTS.map((b) => (
          <Tip key={b.v} content={b.title}>
            <button
              aria-label={b.title}
              onClick={() => onSet({ verdict: verdict === b.v ? null : b.v })}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded border transition-colors",
                verdict === b.v
                  ? b.tone
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
            >
              {b.icon}
            </button>
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
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-[11px] text-muted-foreground hover:text-foreground"
      >
        + note on this EVD
      </button>
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
