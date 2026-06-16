"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, X, FileText, Download } from "lucide-react";

import type { ReviewPaper } from "@/lib/review";
import { cn } from "@/lib/utils";

type Verdict = "covered" | "promoted" | "not_a_result";
interface AnchorState {
  verdict?: Verdict;
  evdIndex?: number; // which existing EVD covers it
  promotedText?: string;
  note?: string;
}
type Reviews = Record<string, AnchorState>;

const KEY = (ck: string) => `review:${ck}`;

function initialReviews(paper: ReviewPaper): Reviews {
  const r: Reviews = {};
  // pre-confirm only strong links, per the plan (don't erode trust with weak guesses)
  for (const a of paper.abstractAnchors) {
    if (a.linkedEvd !== null && a.evdConfidence >= 0.35) {
      r[a.id] = { verdict: "covered", evdIndex: a.linkedEvd };
    }
  }
  for (const o of paper.objectAnchors) {
    if (o.linkedEvds.length > 0) {
      r[o.id] = { verdict: "covered", evdIndex: o.linkedEvds[0] };
    }
  }
  return r;
}

export function ReviewPane({ paper }: { paper: ReviewPaper }) {
  const [reviews, setReviews] = useState<Reviews>({});
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY(paper.citekey));
      setReviews(saved ? JSON.parse(saved) : initialReviews(paper));
    } catch {
      setReviews(initialReviews(paper));
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper.citekey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY(paper.citekey), JSON.stringify(reviews));
  }, [reviews, loaded, paper.citekey]);

  const set = (id: string, patch: AnchorState | null) =>
    setReviews((r) => {
      const next = { ...r };
      if (patch === null) delete next[id];
      else next[id] = { ...next[id], ...patch };
      return next;
    });

  const meter = useMemo(() => {
    const answered = (ids: string[]) =>
      ids.filter((id) => reviews[id]?.verdict).length;
    const absIds = paper.abstractAnchors.map((a) => a.id);
    const objIds = paper.objectAnchors.map((o) => o.id);
    return {
      abs: answered(absIds),
      absTotal: absIds.length,
      obj: answered(objIds),
      objTotal: objIds.length,
      promoted: Object.values(reviews).filter((v) => v.verdict === "promoted")
        .length,
    };
  }, [reviews, paper]);

  const pdfSrc = `/api/pdf/${encodeURIComponent(paper.citekey)}#page=${page}&zoom=page-width`;

  function exportJson() {
    const out = {
      citekey: paper.citekey,
      title: paper.title,
      reviewedAt: new Date().toISOString(),
      meter,
      anchors: [...paper.abstractAnchors, ...paper.objectAnchors].map((a) => {
        const st = reviews[a.id] ?? {};
        const base = { id: a.id, kind: a.kind, ...st } as Record<string, unknown>;
        if ("text" in a) base.text = a.text;
        if ("label" in a) base.label = a.label;
        if (st.evdIndex != null) base.evd = paper.evds[st.evdIndex]?.title;
        return base;
      }),
      promotedCandidates: Object.entries(reviews)
        .filter(([, v]) => v.verdict === "promoted")
        .map(([id, v]) => ({ anchorId: id, text: v.promotedText })),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-${paper.citekey.replace(/^@/, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      {/* Right — checklist */}
      <div className="flex min-h-0 flex-col">
        {/* meter */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs">
          <Meter label="Abstract results" n={meter.abs} d={meter.absTotal} />
          <Meter label="Tables & figures" n={meter.obj} d={meter.objTotal} />
          {meter.promoted > 0 && (
            <span className="font-mono text-primary">
              +{meter.promoted} promoted
            </span>
          )}
          <button
            onClick={exportJson}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[11px] hover:bg-accent/50"
          >
            <Download className="h-3 w-3" /> Export
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <SectionTitle>Abstract results</SectionTitle>
          <p className="mb-3 text-xs text-muted-foreground">
            Each result the abstract reports — is it captured as evidence?
          </p>
          <ul className="space-y-2">
            {paper.abstractAnchors.map((a) => (
              <AnchorCard
                key={a.id}
                title={a.text}
                state={reviews[a.id]}
                suggestion={
                  a.linkedEvd !== null
                    ? {
                        text: paper.evds[a.linkedEvd]?.finding ?? "",
                        confidence: a.evdConfidence,
                        evdIndex: a.linkedEvd,
                      }
                    : undefined
                }
                evds={paper.evds}
                promoteSeed={a.text}
                onSet={(p) => set(a.id, p)}
              />
            ))}
          </ul>

          {paper.objectAnchors.length > 0 && (
            <>
              <SectionTitle className="mt-6">Tables &amp; figures</SectionTitle>
              <p className="mb-3 text-xs text-muted-foreground">
                Each object should be touched by ≥1 piece of evidence.
              </p>
              <ul className="space-y-2">
                {paper.objectAnchors.map((o) => (
                  <AnchorCard
                    key={o.id}
                    title={`${o.label}${o.caption ? " — " + o.caption : ""}`}
                    crop={o.crop}
                    page={o.page ?? undefined}
                    onJump={o.page ? () => setPage(o.page!) : undefined}
                    state={reviews[o.id]}
                    suggestion={
                      o.linkedEvds.length
                        ? {
                            text: paper.evds[o.linkedEvds[0]]?.finding ?? "",
                            confidence: 1,
                            evdIndex: o.linkedEvds[0],
                          }
                        : undefined
                    }
                    evds={paper.evds}
                    promoteSeed={o.caption || o.label}
                    onSet={(p) => set(o.id, p)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Meter({ label, n, d }: { label: string; n: number; d: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          n === d && d > 0 ? "text-primary" : "text-foreground",
        )}
      >
        {n}/{d}
      </span>
    </span>
  );
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function AnchorCard({
  title,
  crop,
  page,
  onJump,
  state,
  suggestion,
  evds,
  promoteSeed,
  onSet,
}: {
  title: string;
  crop?: string | null;
  page?: number;
  onJump?: () => void;
  state?: AnchorState;
  suggestion?: { text: string; confidence: number; evdIndex: number };
  evds: ReviewPaper["evds"];
  promoteSeed: string;
  onSet: (patch: AnchorState | null) => void;
}) {
  const verdict = state?.verdict;
  return (
    <li
      className={cn(
        "rounded-lg border p-3 transition-colors",
        verdict === "covered" && "border-primary/40 bg-primary/5",
        verdict === "promoted" && "border-amber-500/40 bg-amber-500/5",
        verdict === "not_a_result" && "border-border bg-muted/30 opacity-60",
        !verdict && "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        {crop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/attachments/${crop}`}
            alt=""
            className="h-14 w-20 shrink-0 rounded border border-border object-cover"
          />
        )}
        <p className="min-w-0 flex-1 text-sm leading-snug">{title}</p>
      </div>

      {/* suggestion */}
      {suggestion && verdict !== "not_a_result" && verdict !== "promoted" && (
        <p className="mt-2 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
            suggested ·{" "}
            {suggestion.confidence >= 1
              ? "ref"
              : `${Math.round(suggestion.confidence * 100)}%`}
          </span>{" "}
          {suggestion.text.slice(0, 130)}
        </p>
      )}

      {/* promote editor */}
      {verdict === "promoted" && (
        <textarea
          value={state?.promotedText ?? promoteSeed}
          onChange={(e) => onSet({ promotedText: e.target.value })}
          rows={2}
          className="mt-2 w-full resize-y rounded border border-amber-500/40 bg-background px-2 py-1 text-xs"
          placeholder="The result to capture as a new evidence node…"
        />
      )}

      {/* actions */}
      <div className="mt-2 flex items-center gap-1.5">
        <ActionBtn
          active={verdict === "covered"}
          tone="green"
          icon={<Check className="h-3.5 w-3.5" />}
          label="Covered"
          onClick={() =>
            onSet(
              verdict === "covered"
                ? null
                : { verdict: "covered", evdIndex: suggestion?.evdIndex },
            )
          }
        />
        <ActionBtn
          active={verdict === "promoted"}
          tone="amber"
          icon={<Plus className="h-3.5 w-3.5" />}
          label="Promote"
          onClick={() =>
            onSet(
              verdict === "promoted"
                ? null
                : { verdict: "promoted", promotedText: promoteSeed },
            )
          }
        />
        <ActionBtn
          active={verdict === "not_a_result"}
          tone="muted"
          icon={<X className="h-3.5 w-3.5" />}
          label="Not a result"
          onClick={() =>
            onSet(verdict === "not_a_result" ? null : { verdict: "not_a_result" })
          }
        />
        {onJump && (
          <button
            onClick={onJump}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-3 w-3" /> p{page}
          </button>
        )}
      </div>

      {/* which EVD covers it (when covered & ambiguous) */}
      {verdict === "covered" && evds.length > 1 && (
        <select
          value={state?.evdIndex ?? ""}
          onChange={(e) =>
            onSet({ evdIndex: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="">covered by… (pick the evidence)</option>
          {evds.map((e, i) => (
            <option key={i} value={i}>
              {e.title.slice(0, 80)}
            </option>
          ))}
        </select>
      )}
    </li>
  );
}

function ActionBtn({
  active,
  tone,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  tone: "green" | "amber" | "muted";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const tones = {
    green: "border-primary/50 bg-primary/10 text-primary",
    amber: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors",
        active ? tones[tone] : "border-border text-muted-foreground hover:bg-accent/50",
      )}
    >
      {icon} {label}
    </button>
  );
}
