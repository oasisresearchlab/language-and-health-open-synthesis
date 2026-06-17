import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import type { Reviewer, ReviewMap } from "@/lib/accuracy-store";

const REVIEWER: Reviewer = { id: "r-1", name: "Dr. Test", role: "clinician" };
const CK = "@Allan_2022_impact_English";

// ── localStorage fallback (Supabase not configured) ──────────────────────────
describe("accuracy-store · localStorage fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/supabase", () => ({
      supabase: null,
      supabaseConfigured: false,
    }));
    localStorage.clear();
  });
  afterEach(() => vi.doUnmock("@/lib/supabase"));

  it("persists a verdict edit and reads it back", async () => {
    const store = await import("@/lib/accuracy-store");
    const map: ReviewMap = {
      "E-0061:quant": {
        node_id: "E-0061",
        dimension: "quant",
        verdict: "edit",
        proposed: "adjusted OR 0.94, not 0.84",
      },
    };
    await store.saveReview(
      REVIEWER,
      CK,
      map["E-0061:quant"],
      map,
    );

    const back = await store.loadReviews(REVIEWER.id, CK);
    expect(back["E-0061:quant"].verdict).toBe("edit");
    expect(back["E-0061:quant"].proposed).toBe("adjusted OR 0.94, not 0.84");
  });

  it("scopes storage by reviewer and citekey", async () => {
    const store = await import("@/lib/accuracy-store");
    const row = { node_id: "E-1", dimension: "verbatim", verdict: "ok" };
    await store.saveReview(REVIEWER, CK, row, { "E-1:verbatim": row });

    // a different reviewer sees nothing
    const other = await store.loadReviews("r-2", CK);
    expect(other).toEqual({});
    // a different paper sees nothing
    const otherPaper = await store.loadReviews(REVIEWER.id, "@Other_2020");
    expect(otherPaper).toEqual({});
  });

  it("falls back to the static roster when Supabase is absent", async () => {
    const store = await import("@/lib/accuracy-store");
    const roster = await store.fetchRoster();
    expect(roster.length).toBeGreaterThan(0);
    expect(roster.every((r) => r.name && r.role)).toBe(true);
  });
});

// ── Supabase path (configured) ───────────────────────────────────────────────
describe("accuracy-store · Supabase", () => {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const select = vi.fn();
  const from = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    upsert.mockClear();
    select.mockClear();
    from.mockReset();
    // chainable query builder
    from.mockImplementation(() => ({
      upsert,
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }));
    vi.doMock("@/lib/supabase", () => ({
      supabase: { from },
      supabaseConfigured: true,
    }));
  });
  afterEach(() => vi.doUnmock("@/lib/supabase"));

  it("upserts the row with reviewer attribution and the right conflict key", async () => {
    const store = await import("@/lib/accuracy-store");
    const row = {
      node_id: "E-0061",
      dimension: "polarity",
      verdict: "wrong",
      note: "this null result should oppose, not support",
    };
    await store.saveReview(REVIEWER, CK, row, { "E-0061:polarity": row });

    expect(from).toHaveBeenCalledWith("accuracy_reviews");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsert.mock.calls[0];
    expect(payload).toMatchObject({
      reviewer_id: "r-1",
      reviewer_name: "Dr. Test",
      citekey: CK,
      node_id: "E-0061",
      dimension: "polarity",
      verdict: "wrong",
      note: "this null result should oppose, not support",
    });
    expect(opts).toEqual({ onConflict: "reviewer_id,node_id,dimension" });
  });
});
