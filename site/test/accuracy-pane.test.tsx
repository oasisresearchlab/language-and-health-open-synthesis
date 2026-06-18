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
      imageRegion: null,
      quotes: [
        {
          text: '"no significant difference in readmission" (Stolarski, 2022, p. 7387)',
          region: { page: 3, rects: [{ x: 0.5, y: 0.66, w: 0.4, h: 0.02 }] },
        },
      ],
      methods: [
        {
          key: "what",
          label: "What",
          summary: "readmission within one year",
          quotes: [{ text: '"Outcomes of interest…" (p. 7386)', region: null }],
        },
        {
          key: "how",
          label: "How",
          summary: "logistic regression",
          quotes: [
            { text: '"Multivariable logistic regression…" (p. 7386)', region: null },
          ],
        },
        { key: "who", label: "Who", summary: "1662 patients", quotes: [] },
      ],
      claims: [{ id: "C-0008", title: "LEP worsens outcomes", polarity: "opposes" }],
      otherNotes: "",
      caveats: [],
      tags: [],
      page: 3,
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
    const okButtons = await screen.findAllByRole("button", { name: "Correct" });
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
