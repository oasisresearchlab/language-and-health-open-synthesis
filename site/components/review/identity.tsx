"use client";

import { useEffect, useState } from "react";
import { UserCircle2, Database, HardDrive } from "lucide-react";

import {
  fetchRoster,
  supabaseConfigured,
  type Reviewer,
} from "@/lib/accuracy-store";

const RKEY = "review:reviewer";

export function useReviewer() {
  const [reviewer, setReviewer] = useState<Reviewer | null>(null);
  const [roster, setRoster] = useState<Reviewer[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: Reviewer | null = null;
    try {
      const s = localStorage.getItem(RKEY);
      if (s) stored = JSON.parse(s);
    } catch {
      /* noop */
    }
    fetchRoster().then((r) => {
      setRoster(r);
      // drop a stale identity (e.g. a localStorage-only id from before Supabase was
      // wired) so the first write doesn't hit a foreign-key error — re-prompt instead.
      if (stored && !r.some((x) => x.id === stored!.id)) {
        try {
          localStorage.removeItem(RKEY);
        } catch {
          /* noop */
        }
        stored = null;
      }
      setReviewer(stored);
      setReady(true);
    });
  }, []);

  const choose = (r: Reviewer | null) => {
    setReviewer(r);
    try {
      if (r) localStorage.setItem(RKEY, JSON.stringify(r));
      else localStorage.removeItem(RKEY);
    } catch {
      /* noop */
    }
  };

  return { reviewer, roster, choose, ready };
}

/** Full-screen gate shown until a reviewer picks their name. */
export function IdentityGate({
  roster,
  onPick,
}: {
  roster: Reviewer[];
  onPick: (r: Reviewer) => void;
}) {
  return (
    <div className="mx-auto flex min-h-0 max-w-md flex-1 flex-col items-center px-4 py-10 text-center">
      <UserCircle2 className="h-10 w-10 shrink-0 text-muted-foreground" />
      <h2 className="mt-4 shrink-0 font-heading text-xl font-semibold">
        Who&apos;s reviewing?
      </h2>
      <p className="mt-2 shrink-0 text-sm text-muted-foreground">
        Pick your name — every judgment you make is attributed to you.
      </p>
      <ul className="mt-6 w-full min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {roster.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onPick(r)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              <span className="font-medium">{r.name}</span>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {r.role}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <StorageBadge className="mt-4 shrink-0" />
    </div>
  );
}

/** Compact "reviewing as X · switch" bar for the page header. */
export function IdentityBar({
  reviewer,
  onSwitch,
}: {
  reviewer: Reviewer;
  onSwitch: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <UserCircle2 className="h-3.5 w-3.5" />
      <span className="text-foreground">{reviewer.name}</span>
      <button onClick={onSwitch} className="underline hover:text-foreground">
        switch
      </button>
    </span>
  );
}

export function StorageBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground ${className ?? ""}`}
      title={
        supabaseConfigured
          ? "Saving to the central Supabase store"
          : "Supabase not configured — saving to this browser only (Export to share)"
      }
    >
      {supabaseConfigured ? (
        <>
          <Database className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />{" "}
          central
        </>
      ) : (
        <>
          <HardDrive className="h-3 w-3" /> local only
        </>
      )}
    </span>
  );
}
