import { describe, it, expect } from "vitest";

import { searchSnippet, figureLabel } from "@/lib/review-search";

describe("searchSnippet · a distinctive, single-span-matchable token", () => {
  it("prefers a decimal statistic from a finding quote", () => {
    const q =
      '"Following bariatric surgery, there was no significant difference in LOS between EP and LEP patients (2.26 days vs. 2.12 days respectively; p = 0.60)." (Stolarski, 2022, p. 7386)';
    expect(searchSnippet(q)).toBe("2.26");
  });

  it("uses a long integer (e.g. sample size) when there is no decimal", () => {
    const q = '"Over the 5-year study period, 1662 patients underwent SG or LGBP."';
    // 5 is too short to be the 3+ digit pick; 1662 wins
    expect(searchSnippet(q)).toBe("1662");
  });

  it("falls back to the longest word for a qualitative quote", () => {
    const q =
      '"We performed a retrospective review of all patients who underwent bariatric surgery."';
    expect(searchSnippet(q)).toBe("retrospective");
  });

  it("strips the leading quote mark and trailing punctuation", () => {
    expect(searchSnippet('"30-day readmission was 5%."')).toBe("30-day");
    expect(searchSnippet("no numbers here just words")).toBe("numbers");
  });
});

describe("figureLabel · derive a caption to locate from a crop filename", () => {
  it("maps table and figure crops", () => {
    expect(figureLabel("/attachments/Allan_2022_impact_English-table2.png")).toBe(
      "Table 2",
    );
    expect(figureLabel("/attachments/Aparna_2025-fig3.png")).toBe("Fig 3");
  });
  it("returns null when there's no recognizable label", () => {
    expect(figureLabel(null)).toBeNull();
    expect(figureLabel("/attachments/random.png")).toBeNull();
  });
});
