"use client";

import * as React from "react";
import { GitPullRequest, Loader2, Sparkles, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BundleSummary, type BundleSummaryData } from "@/components/bundle-summary";
import { MarkdownProse } from "@/components/markdown-prose";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/lib/types";

interface NodeOption {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
}

interface BundleNode {
  id: string;
  type: NodeType;
  title: string;
  isAnchor: boolean;
  depth: number;
}

interface BundleData {
  anchor: string;
  strategy: "hops" | "semantic";
  depth?: 1 | 2;
  qOverlap?: 1 | 2 | 3;
  nodes: BundleNode[];
  edges: Array<{ from: string; to: string; edge: string }>;
}

type Audience = "academic" | "executive" | "blog" | "position";
type Length = "short" | "medium" | "long";
type Voice = "formal" | "conversational" | "plain";
/** Bundle = the slice of the graph the LLM sees. */
type Bundle = "1-hop" | "2-hop" | "semantic";
/** Q-overlap threshold for the semantic walk: tight=3, balanced=2, wide=1. */
type Breadth = "tight" | "balanced" | "wide";

// Mirrors the OpenRouter fallback chain configured in /api/generate/route.ts.
// Recorded in narrative frontmatter for provenance.
const MODEL_CHAIN =
  "mistralai/mistral-large (with google/gemini-2.5-flash, google/gemini-2.5-flash-lite fallbacks)";

const SESSION_KEY = "pendingNarrative";

interface PendingNarrative {
  anchorId: string;
  bundle: Bundle;
  breadth: Breadth;
  audience: Audience;
  length: Length;
  voice: Voice;
  content: string;
  model: string;
}

function breadthToQOverlap(b: Breadth): 1 | 2 | 3 {
  if (b === "tight") return 3;
  if (b === "wide") return 1;
  return 2;
}

function bundleToRequest(
  b: Bundle,
  breadth: Breadth,
): {
  strategy: "hops" | "semantic";
  depth?: 1 | 2;
  qOverlap?: 1 | 2 | 3;
} {
  if (b === "semantic") {
    return { strategy: "semantic", qOverlap: breadthToQOverlap(breadth) };
  }
  return { strategy: "hops", depth: b === "2-hop" ? 2 : 1 };
}

const AUDIENCES: ReadonlyArray<{ value: Audience; label: string; hint: string }> = [
  { value: "academic", label: "Academic", hint: "Paper section, dense argument" },
  { value: "executive", label: "Executive", hint: "Top-line, what-it-means" },
  { value: "blog", label: "Blog", hint: "Lively, scene-setting" },
  { value: "position", label: "Position", hint: "Declarative, principled" },
];

const LENGTHS: ReadonlyArray<{ value: Length; label: string; hint: string }> = [
  { value: "short", label: "Short", hint: "2–3 paragraphs · ~350 words" },
  { value: "medium", label: "Medium", hint: "4–7 paragraphs · ~750 words" },
  { value: "long", label: "Long", hint: "8–14 paragraphs · ~1.5k words" },
];

const VOICES: ReadonlyArray<{ value: Voice; label: string; hint: string }> = [
  { value: "formal", label: "Formal", hint: "Third-person, careful" },
  { value: "conversational", label: "Conversational", hint: "Direct, contractions ok" },
  { value: "plain", label: "Plain", hint: "Jargon-free, concrete" },
];

const BREADTHS: ReadonlyArray<{
  value: Breadth;
  label: string;
  hint: string;
  tooltip: string;
}> = [
  {
    value: "tight",
    label: "Tight",
    hint: "≥3 shared claims",
    tooltip:
      "A related Question only joins the bundle if 3 or more in-bundle Claims address it. Strongest signal of relatedness; smallest, most focused bundle.",
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "≥2 shared claims (default)",
    tooltip:
      "A related Question joins if at least 2 in-bundle Claims address it. A good compromise between focus and breadth.",
  },
  {
    value: "wide",
    label: "Wide",
    hint: "≥1 shared claim (greedy)",
    tooltip:
      "A related Question joins as soon as a single in-bundle Claim addresses it. Casts a wider net — pulls in more upstream and downstream questions and their evidence.",
  },
];

const BUNDLES: ReadonlyArray<{
  value: Bundle;
  label: string;
  hint: string;
  tooltip: string;
}> = [
  {
    value: "1-hop",
    label: "1 hop",
    hint: "Anchor + direct neighbors",
    tooltip:
      "Plain BFS to depth 1. Pulls every node directly connected to the anchor — outbound or inbound — regardless of edge type. Smallest, fastest bundle. Type-blind: a Question seed grabs its addressing Claims plus anything else 1 hop away, with no filtering by argumentative role.",
  },
  {
    value: "2-hop",
    label: "2 hops",
    hint: "Wider, type-blind",
    tooltip:
      "Plain BFS to depth 2. Pulls direct neighbors and their neighbors, regardless of edge type. Wider context but unfocused — includes anything reachable in two steps. Can balloon quickly on dense subgraphs.",
  },
  {
    value: "semantic",
    label: "Semantic",
    hint: "Type-aware walk",
    tooltip:
      "Type-aware walk driven by argumentative purpose. From a Question: pulls its addressing Claims, each Claim's supporting and opposing Evidence with their Sources, the Methods used, counter-Claims expanded recursively along opposes-chains until they converge, plus related Questions when ≥2 Claims in the bundle address them. From a Claim: just the argumentation lattice around it. Stops on graph topology, not depth — produces tight, on-purpose bundles.",
  },
];

export function GenerateClient({ nodes }: { nodes: NodeOption[] }) {
  // Default-empty initial state. Resume-from-OAuth populates these in a
  // mount-only useEffect below so server and client render identically on
  // first paint (avoiding a hydration mismatch).
  const [anchorId, setAnchorId] = React.useState("");
  const [bundle, setBundle] = React.useState<Bundle>("1-hop");
  const [breadth, setBreadth] = React.useState<Breadth>("balanced");
  const [audience, setAudience] = React.useState<Audience>("academic");
  const [length, setLength] = React.useState<Length>("medium");
  const [voice, setVoice] = React.useState<Voice>("formal");
  const [output, setOutput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [bundleData, setBundleData] = React.useState<BundleData | null>(null);
  const summaryData = React.useMemo<BundleSummaryData | null>(() => {
    if (!bundleData) return null;
    return {
      anchor: bundleData.anchor,
      nodes: bundleData.nodes,
      edges: bundleData.edges,
      strategyLabel:
        bundleData.strategy === "semantic"
          ? `semantic walk · q-overlap = ${bundleData.qOverlap ?? 2}`
          : `${bundleData.depth ?? 1}-hop walk`,
    };
  }, [bundleData]);
  const abortRef = React.useRef<AbortController | null>(null);

  const matched = nodes.find((n) => n.id === anchorId.trim());
  const canGenerate = !!matched && !streaming;
  const canContribute = !!output && !streaming && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!matched) {
      setError("Pick a valid anchor (use the typeahead).");
      return;
    }
    setError(null);
    setOutput("");
    setBundleData(null);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Fetch the bundle in parallel with the streaming generate. It usually
    // arrives long before the LLM finishes.
    const req = bundleToRequest(bundle, breadth);
    const bundleParams = new URLSearchParams({
      anchor: matched.id,
      strategy: req.strategy,
      ...(req.depth ? { depth: String(req.depth) } : {}),
      ...(req.qOverlap ? { qOverlap: String(req.qOverlap) } : {}),
    });
    void fetch(`/api/bundle?${bundleParams.toString()}`, {
      cache: "no-store",
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) return;
        const data = (await r.json()) as BundleData;
        setBundleData(data);
      })
      .catch(() => {
        // Non-fatal — the narrative still streams. Bundle viz just won't show.
      });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorId: matched.id,
          ...bundleToRequest(bundle, breadth),
          audience,
          length,
          voice,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        setError(msg || `Error ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutput((prev) => prev + chunk);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const submitPayload = React.useCallback(
    async (payload: PendingNarrative) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/github/contribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anchorId: payload.anchorId,
            bundle: payload.bundle,
            breadth: payload.bundle === "semantic" ? payload.breadth : undefined,
            audience: payload.audience,
            length: payload.length,
            voice: payload.voice,
            content: payload.content,
            model: payload.model,
          }),
        });
        if (res.status === 401) {
          // Token gone or expired — restart OAuth.
          window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
          window.location.href =
            "/api/github/start?return=" +
            encodeURIComponent("/narratives/generate?resume=1");
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            detail?: string;
          };
          setError(data.detail || data.error || `Error ${res.status}`);
          setSubmitting(false);
          return;
        }
        const data = (await res.json()) as { compareUrl: string };
        window.sessionStorage.removeItem(SESSION_KEY);
        // Same-tab navigation to GitHub's "Compare & pull request" page.
        window.location.href = data.compareUrl;
      } catch (err) {
        setError((err as Error).message);
        setSubmitting(false);
      }
    },
    [],
  );

  async function handleContribute() {
    if (!output) return;
    const payload: PendingNarrative = {
      anchorId,
      bundle,
      breadth,
      audience,
      length,
      voice,
      content: output,
      model: MODEL_CHAIN,
    };
    setSubmitting(true);
    setError(null);
    let authed = false;
    try {
      const meRes = await fetch("/api/github/me", { cache: "no-store" });
      if (meRes.ok) {
        const me = (await meRes.json()) as { authed: boolean };
        authed = me.authed;
      }
    } catch {
      // fall through to OAuth
    }
    if (authed) {
      await submitPayload(payload);
      return;
    }
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    window.location.href =
      "/api/github/start?return=" +
      encodeURIComponent("/narratives/generate?resume=1");
  }

  // Mount-only effect:
  //   - Read ?resume=1 / ?error=auth_denied from the URL (client only — server
  //     renders default empty state to keep hydration consistent).
  //   - If resuming, restore the form from sessionStorage and post it.
  //   - Strip the URL params so a refresh doesn't repeat the action.
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const url = new URL(window.location.href);
    const isResume = url.searchParams.get("resume") === "1";
    const authDenied = url.searchParams.get("error") === "auth_denied";

    let dirty = false;
    if (url.searchParams.has("resume")) {
      url.searchParams.delete("resume");
      dirty = true;
    }
    if (url.searchParams.has("error")) {
      url.searchParams.delete("error");
      dirty = true;
    }
    if (dirty) window.history.replaceState({}, "", url.toString());

    if (authDenied) {
      setError(
        "GitHub authorization was denied. Click 'Submit to repo' to try again.",
      );
      return;
    }

    if (!isResume) return;
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (!stored) return;
    let payload: PendingNarrative;
    try {
      payload = JSON.parse(stored) as PendingNarrative;
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    setAnchorId(payload.anchorId);
    setBundle(payload.bundle);
    setBreadth(payload.breadth);
    setAudience(payload.audience);
    setLength(payload.length);
    setVoice(payload.voice);
    setOutput(payload.content);
    void submitPayload(payload);
  }, [submitPayload]);

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} className="space-y-6 lg:sticky lg:top-20 self-start">
        <div className="space-y-2">
          <label
            htmlFor="anchor"
            className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Anchor
          </label>
          <input
            id="anchor"
            list="anchor-options"
            value={anchorId}
            onChange={(e) => setAnchorId(e.target.value)}
            placeholder="Q-0003"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoComplete="off"
            spellCheck={false}
          />
          <datalist id="anchor-options">
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.typeLabel} — {n.title}
              </option>
            ))}
          </datalist>
          {matched ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-mono text-primary">{matched.typeLabel}</span>
              {" · "}
              {matched.title}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Type an ID like <code className="font-mono">C-0001</code> or
              start typing to search.
            </p>
          )}
        </div>

        <ChipGroup
          label="Bundle"
          value={bundle}
          onChange={setBundle}
          options={BUNDLES}
        />

        {bundle === "semantic" && (
          <ChipGroup
            label="Breadth"
            value={breadth}
            onChange={setBreadth}
            options={BREADTHS}
          />
        )}

        <ChipGroup
          label="Audience"
          value={audience}
          onChange={setAudience}
          options={AUDIENCES}
        />

        <ChipGroup
          label="Length"
          value={length}
          onChange={setLength}
          options={LENGTHS}
        />

        <ChipGroup
          label="Voice"
          value={voice}
          onChange={setVoice}
          options={VOICES}
        />

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {streaming ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleStop}
              className="gap-2"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!canGenerate} className="gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          )}
          {output && !streaming && (
            <Button
              type="button"
              variant="outline"
              onClick={handleContribute}
              disabled={!canContribute}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitPullRequest className="h-3.5 w-3.5" />
              )}
              {submitting ? "Submitting…" : "Submit to repo"}
            </Button>
          )}
        </div>
        {output && !streaming && (
          <p className="text-[11px] text-muted-foreground">
            Submitting opens GitHub&apos;s &ldquo;Compare &amp; pull
            request&rdquo; page on a branch in your fork. You finalize and
            click &ldquo;Create pull request&rdquo; there.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </form>

      <article className="min-w-0">
        {!output && !streaming && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
            <p className="font-sans text-sm text-muted-foreground">
              Pick an anchor and press Generate. The narrative will stream in
              here.
            </p>
          </div>
        )}
        {(output || streaming) && (
          <div className="space-y-6">
            {summaryData && <BundleSummary data={summaryData} />}
            <div>
              {streaming && (
                <p className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-primary">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary align-middle" />
                  {" "}streaming…
                </p>
              )}
              <MarkdownProse source={output} />
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  /** Short subtext rendered under the label. */
  hint?: string;
  /** Longer text shown as the native hover tooltip. Falls back to `hint`. */
  tooltip?: string;
}

function ChipGroup<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<ChipOption<T>>;
}) {
  return (
    <div className="space-y-2">
      <p className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-left text-xs transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50 hover:bg-accent",
              )}
              title={opt.tooltip ?? opt.hint}
            >
              <span className="block font-medium">{opt.label}</span>
              {opt.hint && (
                <span
                  className={cn(
                    "block text-[10px]",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

