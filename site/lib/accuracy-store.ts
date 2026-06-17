"use client";

import { supabase, supabaseConfigured } from "./supabase";

export interface Reviewer {
  id: string;
  name: string;
  role: string;
}

// One judgment cell. Keyed in the map by `${nodeId}:${dimension}`.
export interface ReviewRow {
  node_id: string;
  dimension: string;
  verdict?: string | null; // ok | edit | wrong | na
  proposed?: string | null;
  note?: string | null;
}

export type ReviewMap = Record<string, ReviewRow>;

// Used when Supabase isn't wired (local UX testing). Mirror your real roster here.
const FALLBACK_ROSTER: Reviewer[] = [
  { id: "local-joel", name: "Joel Chan", role: "maintainer" },
  { id: "local-r1", name: "Reviewer 1", role: "clinician" },
  { id: "local-r2", name: "Reviewer 2", role: "clinician" },
];

export { supabaseConfigured };

export async function fetchRoster(): Promise<Reviewer[]> {
  if (!supabase) return FALLBACK_ROSTER;
  const { data, error } = await supabase
    .from("reviewers")
    .select("id,name,role")
    .order("name");
  if (error || !data || data.length === 0) return FALLBACK_ROSTER;
  return data as Reviewer[];
}

const lkey = (reviewerId: string, citekey: string) =>
  `acc:${reviewerId}:${citekey}`;

export async function loadReviews(
  reviewerId: string,
  citekey: string,
): Promise<ReviewMap> {
  if (supabase) {
    const { data } = await supabase
      .from("accuracy_reviews")
      .select("node_id,dimension,verdict,proposed,note")
      .eq("reviewer_id", reviewerId)
      .eq("citekey", citekey);
    const out: ReviewMap = {};
    for (const r of (data ?? []) as ReviewRow[]) {
      out[`${r.node_id}:${r.dimension}`] = r;
    }
    return out;
  }
  try {
    return JSON.parse(localStorage.getItem(lkey(reviewerId, citekey)) ?? "{}");
  } catch {
    return {};
  }
}

// Persist one changed cell. `fullMap` is the post-change map (used for the
// localStorage fallback, which stores the whole paper at once).
export async function saveReview(
  reviewer: Reviewer,
  citekey: string,
  row: ReviewRow,
  fullMap: ReviewMap,
): Promise<void> {
  if (supabase) {
    await supabase.from("accuracy_reviews").upsert(
      {
        reviewer_id: reviewer.id,
        reviewer_name: reviewer.name,
        citekey,
        node_id: row.node_id,
        dimension: row.dimension,
        verdict: row.verdict ?? null,
        proposed: row.proposed ?? null,
        note: row.note ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "reviewer_id,node_id,dimension" },
    );
    return;
  }
  try {
    localStorage.setItem(lkey(reviewer.id, citekey), JSON.stringify(fullMap));
  } catch {
    /* ignore quota */
  }
}
