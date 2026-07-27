"use client";

import { useEffect, useState } from "react";
import { UserCircle2, Database, HardDrive, LogOut } from "lucide-react";

import { ReviewButton } from "@/components/review/controls";
import { supabase } from "@/lib/supabase";
import {
  fetchRosterFull,
  supabaseConfigured,
  type ReviewerRow,
} from "@/lib/accuracy-store";
import { resolveReviewer } from "@/lib/reviewer-identity";

export function useReviewer() {
  const [reviewer, setReviewer] = useState<ReviewerRow | null>(null);
  const [notOnRoster, setNotOnRoster] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const roster = await fetchRosterFull();
      if (!active) return;

      if (!supabase) {
        // No backend (local UX) — first fallback reviewer, no gate.
        setReviewer(roster[0] ?? null);
        setReady(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const resolved = resolveReviewer(
        user?.id ?? null,
        user?.email ?? null,
        roster,
      );
      if (!active) return;

      if (resolved) {
        setReviewer(resolved);
        setNotOnRoster(false);
        // Stamp auth_user_id on first login (self-update policy allows own row).
        if (user && !resolved.auth_user_id) {
          await supabase
            .from("reviewers")
            .update({ auth_user_id: user.id })
            .eq("id", resolved.id);
        }
      } else {
        setReviewer(null);
        setNotOnRoster(!!user);
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return { reviewer, notOnRoster, ready, signOut };
}

/** Shown when a signed-in user has no matching reviewer row. */
export function NotOnRosterGate({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="mx-auto flex min-h-0 max-w-md flex-1 flex-col items-center px-4 py-10 text-center">
      <UserCircle2 className="h-10 w-10 shrink-0 text-muted-foreground" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        You&apos;re signed in, but not on the reviewer roster
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask the maintainer to add your email to the roster, then sign in again.
      </p>
      <ReviewButton
        onClick={onSignOut}
        className="mt-6 rounded-lg border border-border px-4 py-2 hover:bg-accent/50"
      >
        Sign out
      </ReviewButton>
    </div>
  );
}

/** Compact "reviewing as X · log out" bar for the page header. */
export function IdentityBar({
  reviewer,
  onSignOut,
}: {
  reviewer: ReviewerRow;
  onSignOut: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <UserCircle2 className="h-3.5 w-3.5" />
      <span className="text-foreground">{reviewer.name}</span>
      <ReviewButton
        onClick={onSignOut}
        className="inline-flex items-center gap-1 rounded-sm px-0.5 underline hover:text-foreground"
      >
        <LogOut className="h-3 w-3" /> log out
      </ReviewButton>
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
          <Database className="h-3 w-3 text-verdict-correct" />{" "}
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
