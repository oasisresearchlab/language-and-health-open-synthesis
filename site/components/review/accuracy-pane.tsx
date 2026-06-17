"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Pencil,
  X,
  Minus,
  FileText,
  Download,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";

import type { AccuracyPaper, AccuracyEvd } from "@/lib/review-accuracy";
import {
  loadReviews,
  saveReview,
  type Reviewer,
  type ReviewMap,
  type ReviewRow,
} from "@/lib/accuracy-store";
import { useReviewer, IdentityGate, IdentityBar } from "@/components/review/identity";
import { cn } from "@/lib/utils";

type Verdict = "ok" | "edit" | "wrong" | "na";

interface Dimension {
  key: string;
  label: string;
  hint: string;
}

// Core-4 + methods context, per the locked plan (clinician tier).
const DIMENSIONS: Dimension[] = [
  {
    key: "verbatim",
    label: "Verbatim",
    hint: "Quote is the right sentence and matches the PDF — not a coincidental string.",
  },
  {
    key: "grounding",
    label: "Grounding",
    hint: "Correct figure/table is embedded — or correctly none.",
  },
  {
    key: "polarity",
    label: "Claim link & polarity",
    hint: "This EVD really supports / opposes the linked claim as stated.",
  },
  {
    key: "quant",
    label: "Quant fidelity",
    hint: "Direction, magnitude, significance, and CI are faithful to the source.",
  },
  {
    key: "methods",
    label: "Methods context",
    hint: "What (observable) / How (design) / Who (sample) are accurate.",
  },
];

const k = (nodeId: string, dim: string) => `${nodeId}:${dim}`;

export function AccuracyPane({ paper }: { paper: AccuracyPaper }) {
  const { reviewer, roster, choose, ready } = useReviewer();
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(paper.evds.find((e) => e.page)?.page ?? 1);

  useEffect(() => {
    if (!reviewer) return;
    setLoaded(false);
    loadReviews(reviewer.id, paper.citekey).then((m) => {
      setReviews(m);
      setLoaded(true);
    });
  }, [reviewer, paper.citekey]);

  const persist = (row: ReviewRow, next: ReviewMap) => {
    if (reviewer) void saveReview(reviewer, paper.citekey, row, next);
  };

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
      persist(row, next);
      return next;
    });
  };

  const meter = useMemo(() => {
    let doneEvds = 0;
    for (const e of paper.evds) {
      const all = DIMENSIONS.every((d) => reviews[k(e.id, d.key)]?.verdict);
      if (all) doneEvds++;
    }
    const flags = Object.values(reviews).filter(
      (r) => r.verdict === "edit" || r.verdict === "wrong",
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

  const pdfSrc = `/api/pdf/${encodeURIComponent(paper.citekey)}#page=${page}&zoom=page-width`;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Left — PDF */}
      <div className="hidden min-h-0 flex-col border-r border-border lg:flex">
        {paper.hasPdf ? (
          <embed
            key={page}
            src={pdfSrc}
            type="application/pdf"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            PDF not available locally for {paper.citekey}.
          </div>
        )}
      </div>

      {/* Right — per-EVD checklist */}
      <div className="flex min-h-0 flex-col">
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
            <ul className="space-y-4">
              {paper.evds.map((evd, i) => (
                <EvdCard
                  key={evd.id}
                  evd={evd}
                  index={i + 1}
                  reviews={reviews}
                  onJump={evd.page ? () => setPage(evd.page!) : undefined}
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
  const [showMethods, setShowMethods] = useState(false);
  const allDone = DIMENSIONS.every((d) => reviews[k(evd.id, d.key)]?.verdict);

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
          <button
            onClick={onJump}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-3 w-3" /> p{evd.page}
          </button>
        )}
      </div>

      {/* linked claims + polarity */}
      {evd.claims.length > 0 && (
        <div className="mt-2 space-y-1">
          {evd.claims.map((c) => (
            <div key={c.id} className="flex items-start gap-1.5 text-xs">
              {polarityBadge(c.polarity)}
              <a
                href={`/node/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 text-muted-foreground hover:text-foreground hover:underline"
              >
                {c.title}{" "}
                <ArrowUpRight className="inline h-3 w-3 opacity-60" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* grounding image */}
      {evd.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={evd.image}
          alt=""
          className="mt-2 max-h-44 w-full rounded border border-border object-contain"
        />
      )}

      {/* verbatim quotes */}
      {evd.quotes.map((q, qi) => (
        <blockquote
          key={qi}
          className="mt-2 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-muted-foreground"
        >
          {q}
        </blockquote>
      ))}

      {/* methods (collapsible) */}
      {(evd.what || evd.how || evd.who) && (
        <div className="mt-2">
          <button
            onClick={() => setShowMethods((v) => !v)}
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showMethods && "rotate-180",
              )}
            />
            Methods context
          </button>
          {showMethods && (
            <dl className="mt-1.5 space-y-1.5 text-xs">
              {([
                ["What", evd.what],
                ["How", evd.how],
                ["Who", evd.who],
              ] as const).map(([h, v]) =>
                v ? (
                  <div key={h}>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-primary">
                      {h}
                    </dt>
                    <dd className="text-muted-foreground">{v}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          )}
        </div>
      )}

      {/* caveats */}
      {evd.caveats.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {evd.caveats.map((c, ci) => (
            <li key={ci} className="flex gap-1">
              <span className="text-amber-600 dark:text-amber-400">⚑</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* the checklist */}
      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        {DIMENSIONS.map((d) => (
          <DimensionRow
            key={d.key}
            dim={d}
            row={reviews[k(evd.id, d.key)]}
            onSet={(patch) => onSet(d.key, patch)}
          />
        ))}
        <NoteRow
          row={reviews[k(evd.id, "_node")]}
          onSet={(patch) => onSet("_node", patch)}
        />
      </div>
    </li>
  );
}

const VERDICTS: { v: Verdict; icon: React.ReactNode; tone: string; title: string }[] =
  [
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
      title: "Needs an edit (propose the fix)",
    },
    {
      v: "wrong",
      icon: <X className="h-3.5 w-3.5" />,
      tone: "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400",
      title: "Wrong",
    },
    {
      v: "na",
      icon: <Minus className="h-3.5 w-3.5" />,
      tone: "border-border bg-muted text-muted-foreground",
      title: "Not applicable",
    },
  ];

function DimensionRow({
  dim,
  row,
  onSet,
}: {
  dim: Dimension;
  row?: ReviewRow;
  onSet: (patch: Partial<ReviewRow>) => void;
}) {
  const verdict = row?.verdict as Verdict | undefined;
  const showText = verdict === "edit" || verdict === "wrong";
  return (
    <div className="rounded border border-transparent">
      <div className="flex items-center gap-2">
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium"
          title={dim.hint}
        >
          {dim.label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {VERDICTS.map((b) => (
            <button
              key={b.v}
              title={b.title}
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
          ))}
        </div>
      </div>
      {showText && (
        <textarea
          defaultValue={row?.proposed ?? ""}
          onBlur={(e) => onSet({ proposed: e.target.value })}
          rows={2}
          placeholder={
            verdict === "edit"
              ? "Proposed correction…"
              : "What's wrong with it?"
          }
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
  const ref = useRef<HTMLTextAreaElement>(null);
  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => ref.current?.focus(), 0);
        }}
        className="text-[11px] text-muted-foreground hover:text-foreground"
      >
        + note on this EVD
      </button>
    );
  }
  return (
    <textarea
      ref={ref}
      defaultValue={row?.note ?? ""}
      onBlur={(e) => onSet({ note: e.target.value })}
      rows={2}
      placeholder="Anything else about this EVD…"
      className="mt-1 w-full resize-y rounded border border-border bg-background px-2 py-1 text-xs"
    />
  );
}
