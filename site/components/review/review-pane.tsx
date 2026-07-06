"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Plus,
  X,
  FileText,
  Download,
  ChevronRight,
  Flag,
  Ban,
  FlaskConical,
  Crosshair,
} from "lucide-react";
import dynamic from "next/dynamic";

import type { ReviewPaper } from "@/lib/review";
import { searchSnippet, figureLabel } from "@/lib/review-search";
import { ReviewButton, ReviewToggle } from "@/components/review/controls";
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

type Verdict = "covered" | "promoted" | "not_a_result";

interface AnchorState {
  // abstract anchors — one sentence ≈ one atomic result
  verdict?: Verdict;
  evdIndex?: number;
  promotedText?: string;
  // object anchors — a table/figure can carry many results
  evdIndices?: number[]; // existing EVDs this object maps to
  addedEvds?: string[]; // brand-new EVDs authored against this object
  gapNote?: string; // "something interesting that's missing"
  confirmedEmpty?: boolean; // reviewed, nothing to capture
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
      r[o.id] = { evdIndices: [...o.linkedEvds] };
    }
  }
  return r;
}

const filled = (xs?: string[]) => (xs ?? []).filter((s) => s.trim() !== "");

function objectResolved(s?: AnchorState): boolean {
  if (!s) return false;
  return (
    (s.evdIndices?.length ?? 0) > 0 ||
    filled(s.addedEvds).length > 0 ||
    (s.gapNote?.trim() ?? "") !== "" ||
    !!s.confirmedEmpty
  );
}

export function ReviewPane({ paper }: { paper: ReviewPaper }) {
  const [reviews, setReviews] = useState<Reviews>({});
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState({ q: "", n: 0 });
  // Below lg only one pane fits; locating flips to the document.
  const [mobileView, setMobileView] = useState<"review" | "pdf">("review");

  const runSearch = (q: string) => {
    if (q.trim().length >= 2) setSearch((s) => ({ q: q.trim(), n: s.n + 1 }));
    setMobileView("pdf");
  };
  // an abstract result-sentence: search a distinctive token to find it in the body
  const locateText = (text: string) => runSearch(searchSnippet(text));
  // a table/figure: jump to its caption page + search its label ("Table 2")
  const locateObject = (o: ReviewPaper["objectAnchors"][number]) => {
    if (o.page) setPage(o.page);
    runSearch(figureLabel(o.crop) ?? o.label ?? searchSnippet(o.caption ?? ""));
  };

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
    const absIds = paper.abstractAnchors.map((a) => a.id);
    const abs = absIds.filter((id) => reviews[id]?.verdict).length;
    const obj = paper.objectAnchors.filter((o) => objectResolved(reviews[o.id]))
      .length;
    const promoted = Object.values(reviews).filter(
      (v) => v.verdict === "promoted",
    ).length;
    const added = Object.values(reviews).reduce(
      (n, v) => n + filled(v.addedEvds).length,
      0,
    );
    const gaps = Object.values(reviews).filter(
      (v) => (v.gapNote?.trim() ?? "") !== "",
    ).length;
    return {
      abs,
      absTotal: absIds.length,
      obj,
      objTotal: paper.objectAnchors.length,
      promoted,
      added,
      gaps,
    };
  }, [reviews, paper]);

  function exportJson() {
    const out = {
      citekey: paper.citekey,
      title: paper.title,
      reviewedAt: new Date().toISOString(),
      meter,
      abstractAnchors: paper.abstractAnchors.map((a) => {
        const st = reviews[a.id] ?? {};
        return {
          id: a.id,
          text: a.text,
          verdict: st.verdict ?? null,
          evd: st.evdIndex != null ? paper.evds[st.evdIndex]?.title : null,
          promotedText: st.promotedText ?? null,
        };
      }),
      objectAnchors: paper.objectAnchors.map((o) => {
        const st = reviews[o.id] ?? {};
        return {
          id: o.id,
          label: o.label,
          page: o.page,
          mappedEvds: (st.evdIndices ?? []).map((i) => paper.evds[i]?.title),
          addedEvds: filled(st.addedEvds),
          gapNote: st.gapNote?.trim() || null,
          confirmedEmpty: !!st.confirmedEmpty,
        };
      }),
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
            <PdfPane citekey={paper.citekey} page={page} search={search} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              PDF not available locally for {paper.citekey}.
            </div>
          )}
        </div>

        {/* Right — checklist */}
        <div
          className={cn(
            "min-h-0 flex-col overflow-hidden lg:flex",
            mobileView === "review" ? "flex" : "hidden",
          )}
        >
        {/* meter */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-muted/30 px-4 py-2 text-xs">
          <Meter label="Abstract results" n={meter.abs} d={meter.absTotal} />
          <Meter label="Tables & figures" n={meter.obj} d={meter.objTotal} />
          {meter.promoted > 0 && (
            <span className="font-mono text-verdict-edit">
              +{meter.promoted} promoted
            </span>
          )}
          {meter.added > 0 && (
            <span className="font-mono text-verdict-correct">
              +{meter.added} new EVD
            </span>
          )}
          {meter.gaps > 0 && (
            <span className="font-mono text-verdict-wrong">
              {meter.gaps} gap{meter.gaps > 1 ? "s" : ""}
            </span>
          )}
          <ReviewButton
            onClick={exportJson}
            className="ml-auto h-7 border border-border px-2 font-mono text-[11px] hover:bg-accent/50"
          >
            <Download className="h-3 w-3" /> Export
          </ReviewButton>
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
                onLocate={() => locateText(a.text)}
                onSet={(p) => set(a.id, p)}
              />
            ))}
          </ul>

          {paper.objectAnchors.length > 0 && (
            <>
              <SectionTitle className="mt-6">Tables &amp; figures</SectionTitle>
              <p className="mb-3 text-xs text-muted-foreground">
                Map each object to the evidence it grounds (one object can ground
                several), add anything missed, or flag a gap.
              </p>
              <ul className="space-y-2">
                {paper.objectAnchors.map((o) => (
                  <ObjectCard
                    key={o.id}
                    obj={o}
                    evds={paper.evds}
                    state={reviews[o.id]}
                    onJump={() => locateObject(o)}
                    onSet={(p) => set(o.id, p)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
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

/* ── Object (table/figure) card ─────────────────────────────────────────────
   Multi-map to existing EVDs (checkboxes, previewable), add brand-new EVDs,
   flag a gap, or confirm nothing to capture. */
function ObjectCard({
  obj,
  evds,
  state,
  onJump,
  onSet,
}: {
  obj: ReviewPaper["objectAnchors"][number];
  evds: ReviewPaper["evds"];
  state?: AnchorState;
  onJump?: () => void;
  onSet: (patch: AnchorState | null) => void;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const [showGap, setShowGap] = useState(
    (state?.gapNote?.trim() ?? "") !== "",
  );
  const linked = state?.evdIndices ?? [];
  const added = state?.addedEvds ?? [];
  const resolved = objectResolved(state);

  const toggleEvd = (i: number) =>
    onSet({
      evdIndices: linked.includes(i)
        ? linked.filter((x) => x !== i)
        : [...linked, i],
      confirmedEmpty: false,
    });
  const addEvd = () => onSet({ addedEvds: [...added, ""], confirmedEmpty: false });
  const setAdded = (idx: number, text: string) =>
    onSet({ addedEvds: added.map((t, k) => (k === idx ? text : t)) });
  const removeAdded = (idx: number) =>
    onSet({ addedEvds: added.filter((_, k) => k !== idx) });

  return (
    <li
      className={cn(
        "rounded-lg border p-3 transition-colors",
        resolved ? "border-primary/40 bg-primary/5" : "border-border",
        state?.confirmedEmpty && "opacity-70",
      )}
    >
      {/* header */}
      <div className="flex items-start gap-3">
        {obj.crop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/attachments/${obj.crop}`}
            alt=""
            className="h-14 w-20 shrink-0 rounded border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">
            {obj.label}
            {obj.caption ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                — {obj.caption}
              </span>
            ) : null}
          </p>
          <span className="font-mono text-[11px] text-muted-foreground">
            {linked.length > 0 && `${linked.length} mapped`}
            {linked.length > 0 && filled(added).length > 0 && " · "}
            {filled(added).length > 0 && `+${filled(added).length} new`}
          </span>
        </div>
        {onJump && (
          <ReviewButton
            onClick={onJump}
            className="px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-3 w-3" /> p{obj.page}
          </ReviewButton>
        )}
      </div>

      {/* existing EVDs as a checklist */}
      {evds.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {evds.map((e, i) => {
            const on = linked.includes(i);
            const open = preview === i;
            return (
              <li key={i} className="rounded">
                <div
                  className={cn(
                    "flex items-start gap-2 rounded px-1.5 py-1 text-xs",
                    on && "bg-primary/10",
                  )}
                >
                  <ReviewButton
                    onClick={() => toggleEvd(i)}
                    aria-pressed={on}
                    aria-label={on ? "Unmap evidence" : "Map evidence"}
                    className={cn(
                      "mt-0.5 h-4 w-4 rounded-sm border",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {on && <Check className="h-2.5 w-2.5" />}
                  </ReviewButton>
                  <ReviewButton
                    onClick={() => setPreview(open ? null : i)}
                    aria-expanded={open}
                    className="min-w-0 flex-1 justify-start gap-0 text-left leading-snug hover:text-foreground"
                  >
                    <ChevronRight
                      className={cn(
                        "mr-0.5 inline h-3 w-3 text-muted-foreground transition-transform",
                        open && "rotate-90",
                      )}
                    />
                    <span className={on ? "" : "text-muted-foreground"}>
                      {e.title}
                    </span>
                  </ReviewButton>
                </div>
                {open && (
                  <p className="ml-6 mr-1 mb-1 rounded bg-muted/50 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
                    {e.finding}
                    {(e.tables.length > 0 || e.figures.length > 0) && (
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">
                        cites{" "}
                        {[
                          ...e.tables.map((t) => `Table ${t}`),
                          ...e.figures.map((f) => `Fig ${f}`),
                        ].join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* newly authored EVDs */}
      {added.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {added.map((t, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <FlaskConical className="mt-1.5 h-3.5 w-3.5 shrink-0 text-verdict-correct" />
              <textarea
                value={t}
                onChange={(e) => setAdded(idx, e.target.value)}
                rows={2}
                autoFocus={t === ""}
                placeholder="New evidence from this object — state the finding verbatim where possible…"
                className="w-full resize-y rounded border border-verdict-correct/40 bg-background px-2 py-1 text-xs"
              />
              <ReviewButton
                onClick={() => removeAdded(idx)}
                className="mt-1 h-5 w-5 text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </ReviewButton>
            </div>
          ))}
        </div>
      )}

      {/* gap note */}
      {showGap && (
        <div className="mt-2 flex items-start gap-1.5">
          <Flag className="mt-1.5 h-3.5 w-3.5 shrink-0 text-verdict-wrong" />
          <textarea
            value={state?.gapNote ?? ""}
            onChange={(e) => onSet({ gapNote: e.target.value })}
            rows={2}
            autoFocus={(state?.gapNote ?? "") === ""}
            placeholder="Something interesting in this object that isn't captured…"
            className="w-full resize-y rounded border border-verdict-wrong/40 bg-background px-2 py-1 text-xs"
          />
        </div>
      )}

      {/* actions */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <MiniBtn
          icon={<Plus className="h-3.5 w-3.5" />}
          label="Add evidence"
          tone="emerald"
          onClick={addEvd}
        />
        <MiniBtn
          icon={<Flag className="h-3.5 w-3.5" />}
          label="Flag gap"
          tone="rose"
          active={showGap}
          onClick={() => {
            if (showGap && (state?.gapNote?.trim() ?? "") === "")
              onSet({ gapNote: "" });
            setShowGap((v) => !v);
          }}
        />
        <MiniBtn
          icon={<Ban className="h-3.5 w-3.5" />}
          label="Nothing to capture"
          tone="muted"
          active={!!state?.confirmedEmpty}
          onClick={() =>
            onSet({
              confirmedEmpty: !state?.confirmedEmpty,
              ...(!state?.confirmedEmpty ? { evdIndices: [] } : {}),
            })
          }
        />
      </div>
    </li>
  );
}

const MINI_TONE = { emerald: "correct", rose: "wrong", muted: "neutral" } as const;

function MiniBtn({
  icon,
  label,
  tone,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "rose" | "muted";
  active?: boolean;
  onClick: () => void;
}) {
  // No `active` → it's a plain action (e.g. "Add evidence"), not a toggle, so
  // it must not claim a pressed state.
  if (active === undefined) {
    return (
      <ReviewButton
        onClick={onClick}
        className="border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      >
        {icon} {label}
      </ReviewButton>
    );
  }
  return (
    <ReviewToggle
      pressed={active}
      tone={MINI_TONE[tone]}
      onClick={onClick}
      className="px-2 py-1.5 text-xs"
    >
      {icon} {label}
    </ReviewToggle>
  );
}

/* ── Abstract-sentence card (one sentence ≈ one atomic result) ──────────────── */
function AnchorCard({
  title,
  state,
  suggestion,
  evds,
  promoteSeed,
  onLocate,
  onSet,
}: {
  title: string;
  state?: AnchorState;
  suggestion?: { text: string; confidence: number; evdIndex: number };
  evds: ReviewPaper["evds"];
  promoteSeed: string;
  onLocate?: () => void;
  onSet: (patch: AnchorState | null) => void;
}) {
  const verdict = state?.verdict;
  return (
    <li
      className={cn(
        "rounded-lg border p-3 transition-colors",
        verdict === "covered" && "border-primary/40 bg-primary/5",
        verdict === "promoted" && "border-verdict-edit/40 bg-verdict-edit/5",
        verdict === "not_a_result" && "border-border bg-muted/30 opacity-60",
        !verdict && "border-border",
      )}
    >
      <div className="flex items-start gap-1.5">
        <p className="min-w-0 flex-1 text-sm leading-snug">{title}</p>
        {onLocate && (
          <ReviewButton
            onClick={onLocate}
            aria-label="Find in PDF"
            title="Find this result in the PDF"
            className="mt-0.5 h-6 w-6 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </ReviewButton>
        )}
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
          className="mt-2 w-full resize-y rounded border border-verdict-edit/40 bg-background px-2 py-1 text-xs"
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
      </div>

      {/* which EVD covers it (when covered & ambiguous) */}
      {verdict === "covered" && evds.length > 1 && (
        <select
          value={state?.evdIndex ?? ""}
          onChange={(e) =>
            onSet({
              evdIndex: e.target.value === "" ? undefined : Number(e.target.value),
            })
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

const ACTION_TONE = { green: "primary", amber: "edit", muted: "neutral" } as const;

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
  return (
    <ReviewToggle
      pressed={active}
      tone={ACTION_TONE[tone]}
      onClick={onClick}
      className="px-2 py-1.5 text-xs"
    >
      {icon} {label}
    </ReviewToggle>
  );
}
