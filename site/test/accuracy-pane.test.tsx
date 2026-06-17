import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AccuracyPaper } from "@/lib/review-accuracy";

// Mock the store so we can assert on persistence without a backend.
// vi.hoisted so the spies exist before the hoisted vi.mock factory runs.
const { saveReview, loadReviews, fetchRoster } = vi.hoisted(() => ({
  saveReview: vi.fn().mockResolvedValue(undefined),
  loadReviews: vi.fn().mockResolvedValue({}),
  fetchRoster: vi
    .fn()
    .mockResolvedValue([{ id: "r-1", name: "Dr. Test", role: "clinician" }]),
}));

vi.mock("@/lib/accuracy-store", () => ({
  saveReview,
  loadReviews,
  fetchRoster,
  supabaseConfigured: false,
}));

import { AccuracyPane } from "@/components/review/accuracy-pane";

const PAPER: AccuracyPaper = {
  citekey: "@Allan_2022_impact_English",
  title: "The impact of English proficiency on outcomes after bariatric surgery",
  author: "Stolarski",
  year: "2022",
  doi: "",
  pubmedId: "",
  hasPdf: true,
  evds: [
    {
      id: "E-0061",
      title: "No significant difference in one-year readmission (adjusted OR 0.94)",
      description: "No significant difference in readmission.",
      image: null,
      quotes: ['"no significant difference in readmission" (Stolarski, 2022, p. 7387)'],
      what: "readmission within one year",
      how: "logistic regression",
      who: "1662 patients",
      claims: [{ id: "C-0008", title: "LEP worsens outcomes", polarity: "opposes" }],
      caveats: [],
      tags: [],
      page: 7387,
    },
  ],
};

describe("AccuracyPane · review flow", () => {
  beforeEach(() => {
    saveReview.mockClear();
    loadReviews.mockClear();
    localStorage.clear();
  });

  it("gates on identity, then persists a verdict click attributed to the reviewer", async () => {
    const user = userEvent.setup();
    render(<AccuracyPane paper={PAPER} />);

    // identity gate first
    const pick = await screen.findByRole("button", { name: /Dr\. Test/ });
    await user.click(pick);

    // EVD + its checklist now render
    await screen.findByText(/one-year readmission/);

    // click the "Correct" verdict on the Verbatim row (first such button)
    const okButtons = await screen.findAllByTitle("Correct");
    await user.click(okButtons[0]);

    await waitFor(() => expect(saveReview).toHaveBeenCalled());
    const [reviewer, citekey, row] = saveReview.mock.calls[0];
    expect(reviewer).toMatchObject({ id: "r-1", name: "Dr. Test" });
    expect(citekey).toBe("@Allan_2022_impact_English");
    expect(row).toMatchObject({
      node_id: "E-0061",
      dimension: "verbatim",
      verdict: "ok",
    });
  });

  it("loads existing reviews for the chosen reviewer on mount", async () => {
    const user = userEvent.setup();
    render(<AccuracyPane paper={PAPER} />);
    await user.click(await screen.findByRole("button", { name: /Dr\. Test/ }));
    await waitFor(() =>
      expect(loadReviews).toHaveBeenCalledWith("r-1", PAPER.citekey),
    );
  });
});
