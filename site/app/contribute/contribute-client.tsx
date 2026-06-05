"use client";

import * as React from "react";
import { GitPullRequest, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarkdownProse } from "@/components/markdown-prose";
import { cn } from "@/lib/utils";
import type { EdgeType, NodeType } from "@/lib/types";

interface NodeOption {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
}

const SESSION_KEY = "pendingContributeNode";
const RETURN_PATH = "/contribute";

const TYPE_CHIPS: ReadonlyArray<{
  value: NodeType;
  label: string;
  hint: string;
}> = [
  { value: "question", label: "Question", hint: "Q · accumulates Claims" },
  { value: "claim", label: "Claim", hint: "C · responds to a Question" },
  { value: "evidence", label: "Evidence", hint: "E · cites a Source" },
  { value: "method", label: "Method", hint: "M · informs Claims" },
  { value: "source", label: "Source", hint: "S · citation backstop" },
];

const MIN_WORDS = 50;
const MAX_WORDS = 250;

interface EdgeFieldDef {
  edge: EdgeType;
  label: string;
  hint: string;
  /** ID-prefix filter for the typeahead datalist. */
  targetType: NodeType;
  required?: boolean;
  /** Render only as an "at least one of …" group with `groupKey`. */
  groupKey?: string;
}

const EDGE_FIELDS_BY_TYPE: Record<NodeType, EdgeFieldDef[]> = {
  question: [],
  claim: [
    {
      edge: "addresses",
      label: "addresses",
      hint: "Question(s) this Claim responds to",
      targetType: "question",
      required: true,
    },
    {
      edge: "supports",
      label: "supports",
      hint: "Claim(s) this Claim follows from",
      targetType: "claim",
    },
    {
      edge: "opposes",
      label: "opposes",
      hint: "Claim(s) this Claim is a counterclaim to",
      targetType: "claim",
    },
    {
      edge: "usesMethod",
      label: "usesMethod",
      hint: "Method(s) this Claim invokes",
      targetType: "method",
    },
  ],
  evidence: [
    {
      edge: "supports",
      label: "supports",
      hint: "Claim(s) this Evidence corroborates",
      targetType: "claim",
      groupKey: "support_or_oppose",
    },
    {
      edge: "opposes",
      label: "opposes",
      hint: "Claim(s) this Evidence is counter-evidence to",
      targetType: "claim",
      groupKey: "support_or_oppose",
    },
    {
      edge: "derivedFrom",
      label: "derivedFrom",
      hint: "Source(s) this Evidence is grounded in",
      targetType: "source",
      required: true,
    },
  ],
  method: [
    {
      edge: "informs",
      label: "informs",
      hint: "Claim(s) this Method is the analytical instrument behind",
      targetType: "claim",
    },
  ],
  source: [],
  evidencepattern: [
    {
      edge: "supports",
      label: "supports",
      hint: "Claim(s) this Evidence Pattern corroborates",
      targetType: "claim",
    },
  ],
  artifact: [],
};

// ---------------------------------------------------------------------------

interface DuplicateMatch {
  id: string;
  title: string;
  score: number;
}

interface PendingNode {
  type: NodeType;
  title: string;
  body: string;
  edges: Partial<Record<EdgeType, string[]>>;
}

function parseIdList(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------

export function ContributeClient({ nodes }: { nodes: NodeOption[] }) {
  const [type, setType] = React.useState<NodeType>("claim");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  /** Per-edge raw input strings (comma-separated IDs, what the user typed). */
  const [edgeInputs, setEdgeInputs] = React.useState<
    Partial<Record<EdgeType, string>>
  >({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [duplicates, setDuplicates] = React.useState<DuplicateMatch[]>([]);

  // Reset edge inputs when the type changes — different types accept
  // different fields, and stale values would be silently dropped server-side.
  const lastTypeRef = React.useRef(type);
  React.useEffect(() => {
    if (lastTypeRef.current !== type) {
      setEdgeInputs({});
      lastTypeRef.current = type;
    }
  }, [type]);

  // Lexical duplicate hint, debounced.
  React.useEffect(() => {
    const q = title.trim();
    if (q.length < 2) {
      setDuplicates([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type, q, k: "3" });
      fetch(`/api/duplicates?${params.toString()}`, {
        cache: "no-store",
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { matches: [] }))
        .then((data: { matches?: DuplicateMatch[] }) => {
          setDuplicates(data.matches ?? []);
        })
        .catch(() => {
          // Ignore — non-fatal. The duplicate hint is just a hint.
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [title, type]);

  const edgeFields = EDGE_FIELDS_BY_TYPE[type];

  // Parsed edge map (used for preview + submit).
  const parsedEdges = React.useMemo<Partial<Record<EdgeType, string[]>>>(() => {
    const out: Partial<Record<EdgeType, string[]>> = {};
    for (const field of edgeFields) {
      const raw = edgeInputs[field.edge] ?? "";
      const ids = parseIdList(raw);
      if (ids.length > 0) out[field.edge] = ids;
    }
    return out;
  }, [edgeInputs, edgeFields]);

  const wordCount = React.useMemo(() => countWords(body), [body]);

  // Client-side validation gate: title + body length + required edges. The
  // server enforces all of these too — this just keeps the button honest.
  const validationProblem: string | null = React.useMemo(() => {
    if (!title.trim()) return "title required";
    if (wordCount < MIN_WORDS) return `body needs ≥${MIN_WORDS} words`;
    if (wordCount > MAX_WORDS) return `body must be ≤${MAX_WORDS} words`;
    for (const f of edgeFields) {
      if (f.required) {
        const got = parsedEdges[f.edge]?.length ?? 0;
        if (got === 0) return `${f.label} required`;
      }
    }
    if (type === "evidence") {
      const sup = parsedEdges.supports?.length ?? 0;
      const opp = parsedEdges.opposes?.length ?? 0;
      if (sup + opp === 0) return "at least one supports or opposes required";
    }
    return null;
  }, [title, wordCount, edgeFields, parsedEdges, type]);

  const submitPayload = React.useCallback(
    async (payload: PendingNode) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/github/contribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "node", ...payload }),
        });
        if (res.status === 401) {
          window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
          window.location.href =
            "/api/github/start?return=" +
            encodeURIComponent(`${RETURN_PATH}?resume=1`);
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
        window.location.href = data.compareUrl;
      } catch (err) {
        setError((err as Error).message);
        setSubmitting(false);
      }
    },
    [],
  );

  async function handleContribute() {
    if (validationProblem) {
      setError(validationProblem);
      return;
    }
    const payload: PendingNode = {
      type,
      title: title.trim(),
      body,
      edges: parsedEdges,
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
      encodeURIComponent(`${RETURN_PATH}?resume=1`);
  }

  // Mount-only resume effect — same shape as generate-client.tsx.
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
    let payload: PendingNode;
    try {
      payload = JSON.parse(stored) as PendingNode;
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    setType(payload.type);
    setTitle(payload.title);
    setBody(payload.body);
    // Re-hydrate edge inputs as comma-joined strings so the form shows what
    // the user had before the OAuth round-trip.
    const inputs: Partial<Record<EdgeType, string>> = {};
    for (const [k, v] of Object.entries(payload.edges ?? {})) {
      if (Array.isArray(v) && v.length > 0) {
        inputs[k as EdgeType] = v.join(", ");
      }
    }
    setEdgeInputs(inputs);
    void submitPayload(payload);
  }, [submitPayload]);

  // Render --------------------------------------------------------------

  return (
    <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleContribute();
        }}
        className="space-y-6 lg:sticky lg:top-20 self-start"
      >
        <ChipGroup
          label="Type"
          value={type}
          onChange={setType}
          options={TYPE_CHIPS}
        />

        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short readable title"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoComplete="off"
            spellCheck
            maxLength={200}
          />
          {duplicates.length > 0 ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
              <p className="mb-1 font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Possible duplicates ({type})
              </p>
              <ul className="space-y-0.5 text-muted-foreground">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <span className="font-mono text-primary">{d.id}</span>
                    {" — "}
                    {d.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              We&apos;ll surface the closest existing {type}s as you type.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="body"
            className="flex items-baseline justify-between font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <span>Body</span>
            <span
              className={cn(
                "font-mono normal-case tracking-normal",
                wordCount < MIN_WORDS || wordCount > MAX_WORDS
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {wordCount}/{MAX_WORDS}
            </span>
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="50–250 words of self-contained prose. A reader should be able to understand the node from this body alone."
            className="w-full min-h-[200px] resize-y rounded-md border border-border bg-background px-3 py-2 font-sans text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            spellCheck
          />
          <p className="text-[11px] text-muted-foreground">
            {type === "source"
              ? "For Sources, the body is citation metadata: author, year, title, venue, type, and what the graph cites it for."
              : `Aim for ${MIN_WORDS}-${MAX_WORDS} words. Cite other nodes by ID (e.g. C-0001, S-0042).`}
          </p>
        </div>

        {edgeFields.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            {type === "question"
              ? "Question nodes accumulate Claims that address them — no outbound edges typically required."
              : "Source nodes have no outbound edges; they're the citation backstop for Evidence."}
          </p>
        )}

        {edgeFields.map((field) => (
          <EdgeInput
            key={field.edge}
            field={field}
            value={edgeInputs[field.edge] ?? ""}
            onChange={(v) =>
              setEdgeInputs((prev) => ({ ...prev, [field.edge]: v }))
            }
            nodes={nodes}
          />
        ))}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            type="submit"
            disabled={!!validationProblem || submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <GitPullRequest className="h-3.5 w-3.5" />
            )}
            {submitting ? "Submitting…" : "Submit to repo"}
          </Button>
        </div>
        {validationProblem && !submitting && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {validationProblem}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Submitting opens GitHub&apos;s &ldquo;Compare &amp; pull
          request&rdquo; page on a branch in your fork. You finalize and click
          &ldquo;Create pull request&rdquo; there. The node lands as
          status: <span className="font-mono">draft</span>.
        </p>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </form>

      <article className="min-w-0 space-y-6">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Preview · YAML frontmatter
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-card px-4 py-3 font-mono text-xs leading-relaxed">
            {renderFrontmatterPreview(type, title, parsedEdges)}
          </pre>
        </div>

        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Preview · Body
          </p>
          {body.trim().length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
              <p className="font-sans text-sm text-muted-foreground">
                Write the body in the form on the left to preview.
              </p>
            </div>
          ) : (
            <MarkdownProse source={body} />
          )}
        </div>

        <BundlePreview edges={parsedEdges} nodes={nodes} />
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------------

function renderFrontmatterPreview(
  type: NodeType,
  title: string,
  edges: Partial<Record<EdgeType, string[]>>,
): string {
  const fields = EDGE_FIELDS_BY_TYPE[type];
  const ordered: EdgeType[] = fields.map((f) => f.edge);
  const populated = ordered.filter((k) => (edges[k]?.length ?? 0) > 0);

  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("---");
  lines.push(`id: ${prefixForType(type)}-NNNN`);
  lines.push(`type: ${type}`);
  lines.push(`title: ${title.trim() ? yamlInline(title.trim()) : "<title>"}`);
  lines.push(`status: draft`);
  lines.push(`created: ${today}`);
  if (populated.length === 0) {
    lines.push(`edges: {}`);
  } else {
    lines.push(`edges:`);
    for (const k of populated) {
      lines.push(`  ${k}: [${edges[k]!.join(", ")}]`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function yamlInline(s: string): string {
  if (
    /^[A-Za-z][A-Za-z0-9 _.,'/()&+-]*$/.test(s) &&
    !/^(true|false|null|yes|no|on|off)$/i.test(s) &&
    !/^[0-9]/.test(s)
  ) {
    return s;
  }
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function prefixForType(t: NodeType): string {
  switch (t) {
    case "question":
      return "Q";
    case "claim":
      return "C";
    case "evidence":
      return "E";
    case "method":
      return "M";
    case "source":
      return "S";
    case "evidencepattern":
      return "P";
    case "artifact":
      return "A";
  }
}

// ---------------------------------------------------------------------------

function BundlePreview({
  edges,
  nodes,
}: {
  edges: Partial<Record<EdgeType, string[]>>;
  nodes: NodeOption[];
}) {
  const byId = React.useMemo(() => {
    const m = new Map<string, NodeOption>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const grouped = (Object.entries(edges) as Array<[
    EdgeType,
    string[],
  ]>).filter(([, v]) => v.length > 0);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Preview · Bundle
      </p>
      <div className="space-y-3 rounded-md border border-border bg-card px-4 py-3">
        {grouped.map(([edge, ids]) => (
          <div key={edge}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {edge}
            </p>
            <ul className="space-y-0.5 text-xs">
              {ids.map((id) => {
                const n = byId.get(id);
                return (
                  <li key={id}>
                    <span className="font-mono text-primary">{id}</span>
                    {n ? (
                      <>
                        {" — "}
                        {n.title}
                      </>
                    ) : (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        (not found)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EdgeInput({
  field,
  value,
  onChange,
  nodes,
}: {
  field: EdgeFieldDef;
  value: string;
  onChange: (v: string) => void;
  nodes: NodeOption[];
}) {
  const datalistId = `edge-${field.edge}-options`;
  const filtered = React.useMemo(
    () => nodes.filter((n) => n.type === field.targetType),
    [nodes, field.targetType],
  );
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`edge-${field.edge}`}
        className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <input
        id={`edge-${field.edge}`}
        list={datalistId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${field.targetType.charAt(0).toUpperCase()}-NNNN, ${field.targetType.charAt(0).toUpperCase()}-NNNN`}
        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        autoComplete="off"
        spellCheck={false}
      />
      <datalist id={datalistId}>
        {filtered.map((n) => (
          <option key={n.id} value={n.id}>
            {n.typeLabel} — {n.title}
          </option>
        ))}
      </datalist>
      <p className="text-[11px] text-muted-foreground">{field.hint}. Comma-separated IDs.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
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
