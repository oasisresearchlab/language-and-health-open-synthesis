"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";

import {
  loadAllReviews,
  supabaseConfigured,
  type QueueRow,
} from "@/lib/accuracy-store";
import type { NodeMeta } from "@/lib/review-queue";
import { ReviewButton, ReviewToggle } from "@/components/review/controls";
import { cn } from "@/lib/utils";

type Tab = "all" | "disagreements" | "flagged";

const FLAGGED = new Set(["edit", "wrong", "missing"]);

function canonDim(d: string): string {
  if (d === "_node" || d === "_paper") return "note";
  if (d.startsWith("methods")) return "methods";
  if (d.startsWith("polarity")) return "polarity";
  return d;
}
function prettyDim(d: string): string {
  if (d === "_node") return "EVD note";
  if (d === "_paper") return "paper note";
  if (d.startsWith("methods:")) return `methods · ${d.split(":")[1]}`;
  if (d.startsWith("polarity:") && d !== "polarity:_none")
    return `polarity · ${d.split(":")[1]}`;
  return d;
}
const groupKey = (r: QueueRow) => `${r.node_id}::${r.dimension}`;

const VERDICT_TONE: Record<string, string> = {
  ok: "text-verdict-correct",
  edit: "text-verdict-edit",
  wrong: "text-verdict-wrong",
  missing: "text-verdict-missing",
  na: "text-verdict-na",
};

export function QueueDashboard({ meta }: { meta: Record<string, NodeMeta> }) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [fPaper, setFPaper] = useState("");
  const [fReviewer, setFReviewer] = useState("");
  const [fDim, setFDim] = useState("");
  const [fVerdict, setFVerdict] = useState("");

  const refresh = () => {
    setLoading(true);
    loadAllReviews().then((r) => {
      setRows(r);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  // (node,dimension) groups where reviewers disagree
  const disagreed = useMemo(() => {
    const byGroup = new Map<string, Map<string, string>>(); // group → reviewer → verdict
    for (const r of rows) {
      if (!r.verdict) continue;
      const g = byGroup.get(groupKey(r)) ?? new Map();
      g.set(r.reviewer_id, r.verdict);
      byGroup.set(groupKey(r), g);
    }
    const out = new Set<string>();
    for (const [k, g] of byGroup) {
      if (g.size >= 2 && new Set(g.values()).size > 1) out.add(k);
    }
    return out;
  }, [rows]);

  const papers = useMemo(
    () => [...new Set(rows.map((r) => r.citekey))].sort(),
    [rows],
  );
  const reviewers = useMemo(
    () => [...new Set(rows.map((r) => r.reviewer_name ?? r.reviewer_id))].sort(),
    [rows],
  );
  const dims = useMemo(
    () => [...new Set(rows.map((r) => canonDim(r.dimension)))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (fPaper && r.citekey !== fPaper) return false;
      if (fReviewer && (r.reviewer_name ?? r.reviewer_id) !== fReviewer) return false;
      if (fDim && canonDim(r.dimension) !== fDim) return false;
      if (fVerdict && r.verdict !== fVerdict) return false;
      if (tab === "flagged" && !FLAGGED.has(r.verdict ?? "")) return false;
      if (tab === "disagreements" && !disagreed.has(groupKey(r))) return false;
      return true;
    });
  }, [rows, fPaper, fReviewer, fDim, fVerdict, tab, disagreed]);

  // per-dimension verdict tally (precision-ish view) over the *filtered* set
  const tally = useMemo(() => {
    const t: Record<string, Record<string, number>> = {};
    for (const r of filtered) {
      if (!r.verdict) continue;
      const d = canonDim(r.dimension);
      t[d] ??= {};
      t[d][r.verdict] = (t[d][r.verdict] ?? 0) + 1;
    }
    return t;
  }, [filtered]);

  function exportData(kind: "csv" | "json") {
    const enriched = filtered.map((r) => ({
      created_at: r.created_at,
      reviewer: r.reviewer_name ?? r.reviewer_id,
      citekey: r.citekey,
      node_id: r.node_id,
      evd_title: meta[r.node_id]?.title ?? "",
      dimension: r.dimension,
      verdict: r.verdict ?? "",
      disagreement: disagreed.has(groupKey(r)),
      proposed: r.proposed ?? "",
      note: r.note ?? "",
    }));
    let blob: Blob;
    if (kind === "json") {
      blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), tally, rows: enriched }, null, 2)],
        { type: "application/json" },
      );
    } else {
      const cols = Object.keys(enriched[0] ?? { node_id: "" });
      const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [
        cols.join(","),
        ...enriched.map((row) => cols.map((c) => esc((row as Record<string, unknown>)[c])).join(",")),
      ].join("\n");
      blob = new Blob([csv], { type: "text/csv" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-queue-${tab}.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!supabaseConfigured) {
    return (
      <p className="mt-8 rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
        The queue reads the central store, which isn&apos;t configured here
        (localStorage reviews are per-browser). Set <code>NEXT_PUBLIC_SUPABASE_*</code>{" "}
        (see <code>supabase/README.md</code>).
      </p>
    );
  }

  return (
    <div className="mt-8">
      {/* summary */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <Stat label="judgments" value={rows.length} />
        <Stat label="reviewers" value={reviewers.length} />
        <Stat label="papers" value={papers.length} />
        <Stat
          label="flagged"
          value={rows.filter((r) => FLAGGED.has(r.verdict ?? "")).length}
          tone="text-verdict-edit"
        />
        <Stat
          label="disagreements"
          value={disagreed.size}
          tone="text-verdict-wrong"
        />
        <ReviewButton
          onClick={refresh}
          className="ml-auto h-7 border border-border px-2 font-mono text-[11px] hover:bg-accent/50"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> Refresh
        </ReviewButton>
        <ReviewButton
          onClick={() => exportData("csv")}
          className="h-7 border border-border px-2 font-mono text-[11px] hover:bg-accent/50"
        >
          <Download className="h-3 w-3" /> CSV
        </ReviewButton>
        <ReviewButton
          onClick={() => exportData("json")}
          className="h-7 border border-border px-2 font-mono text-[11px] hover:bg-accent/50"
        >
          <Download className="h-3 w-3" /> JSON
        </ReviewButton>
      </div>

      {/* per-dimension tally */}
      {Object.keys(tally).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {Object.entries(tally).map(([dim, vs]) => (
            <span
              key={dim}
              className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1"
            >
              <span className="font-medium">{dim}</span>
              {(["ok", "edit", "wrong", "missing", "na"] as const).map((v) =>
                vs[v] ? (
                  <span key={v} className={cn("font-mono", VERDICT_TONE[v])}>
                    {v}:{vs[v]}
                  </span>
                ) : null,
              )}
            </span>
          ))}
        </div>
      )}

      {/* tabs + filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["all", "disagreements", "flagged"] as Tab[]).map((t) => (
          <ReviewToggle
            key={t}
            pressed={tab === t}
            tone="primary"
            onClick={() => setTab(t)}
            className="rounded-full px-3 py-1 text-xs capitalize"
          >
            {t}
            {t === "disagreements" && disagreed.size > 0 && ` (${disagreed.size})`}
          </ReviewToggle>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={fPaper} onChange={setFPaper} placeholder="All papers" options={papers} />
          <Select value={fReviewer} onChange={setFReviewer} placeholder="All reviewers" options={reviewers} />
          <Select value={fDim} onChange={setFDim} placeholder="All dimensions" options={dims} />
          <Select
            value={fVerdict}
            onChange={setFVerdict}
            placeholder="All verdicts"
            options={["ok", "edit", "wrong", "missing", "na"]}
          />
        </div>
      </div>

      {/* table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Paper</th>
              <th className="px-3 py-2">Dimension</th>
              <th className="px-3 py-2">Reviewer</th>
              <th className="px-3 py-2">Verdict</th>
              <th className="px-3 py-2">Proposed / note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  {rows.length === 0 ? "No reviews submitted yet." : "No rows match."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const m = meta[r.node_id];
                const dis = disagreed.has(groupKey(r));
                return (
                  <tr key={r.id} className="align-top hover:bg-accent/20">
                    <td className="px-3 py-2">
                      <a
                        href={`/node/${r.node_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-muted-foreground hover:underline"
                      >
                        {r.node_id}
                      </a>
                      <div className="max-w-xs truncate" title={m?.title}>
                        {m?.title ?? <span className="text-muted-foreground">{r.citekey}</span>}
                      </div>
                    </td>
                    <td
                      className="max-w-[12rem] truncate px-3 py-2 font-mono text-muted-foreground"
                      title={m?.paperTitle ?? r.citekey}
                    >
                      {r.citekey}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        {prettyDim(r.dimension)}
                        {dis && (
                          <AlertTriangle
                            className="h-3 w-3 text-verdict-wrong"
                            aria-label="reviewers disagree"
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.reviewer_name ?? r.reviewer_id}</td>
                    <td className={cn("px-3 py-2 font-medium", VERDICT_TONE[r.verdict ?? ""])}>
                      {r.verdict ?? "—"}
                    </td>
                    <td className="max-w-sm px-3 py-2 text-muted-foreground">
                      {r.proposed || r.note || ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cn("font-mono text-lg tabular-nums", tone ?? "text-foreground")}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-border bg-background px-2 py-1 text-xs"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
