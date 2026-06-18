import { describe, it, expect } from "vitest";

import { buildEvd } from "@/lib/review-accuracy";
import type { GraphNode } from "@/lib/types";

// A representative EVD body (trimmed from graph/evidence/E-0061.md).
const BODY = `
## Description

![](/attachments/Allan_2022_impact_English-table2.png)

Despite more frequent ED visits by EP patients, there was no significant difference in hospital readmission within one year (adjusted OR = 0.94, 95% CI 0.56–1.55; p = 0.50) (Table 2).

> "However, despite more frequent ED visits by EP patients, there was no significant difference in readmission within one year; adjusted OR = 0.94 (95% CI 0.56–1.55; p = 0.50)." (Stolarski, 2022, p. 7387)

## Methods Context

### What?

The observable: all-cause hospital readmission within 30 days and one year.

> "Outcomes of interest included 30-day and one year all cause visits to the emergency department" (Stolarski, 2022, p. 7386)

### How?

Retrospective chart review; readmission compared with multivariable logistic regression.

> "Multivariable logistic regression was used to evaluate dichotomous outcomes." (Stolarski, 2022, p. 7386)

### Who?

1662 patients at one academic bariatric center; 671 (40%) LEP.

> "Over the 5-year study period, 1662 patients underwent SG or LGBP." (Stolarski, 2022, p. 7386)

## Caveats

- **Single-site retrospective design** could not capture care at outside institutions.
- **High interpreter infrastructure** limits generalizability.
`;

function node(over: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "E-0061",
    type: "evidence",
    title: "No significant difference in one-year readmission (adjusted OR 0.94)",
    sections: [],
    body: BODY,
    filePath: "graph/evidence/E-0061.md",
    outgoing: [
      { edge: "opposes", to: "C-0008" },
      { edge: "derivedFrom", to: "S-0004" },
    ],
    incoming: [],
    ...over,
  } as GraphNode;
}

const nodes = new Map<string, GraphNode>([
  [
    "C-0008",
    {
      id: "C-0008",
      type: "claim",
      title: "LEP is associated with worse post-surgical outcomes",
      sections: [],
      body: "",
      filePath: "",
      outgoing: [],
      incoming: [],
    } as GraphNode,
  ],
]);

describe("buildEvd · parses an EVD body for review", () => {
  const evd = buildEvd(node(), nodes);

  it("extracts the grounding image", () => {
    expect(evd.image).toBe("/attachments/Allan_2022_impact_English-table2.png");
  });

  it("pulls the verbatim quote out of the Description (image/prose stripped)", () => {
    expect(evd.quotes.length).toBeGreaterThanOrEqual(1);
    expect(evd.quotes[0]).toContain("no significant difference in readmission");
    expect(evd.description).not.toContain("![");
    expect(evd.description).not.toContain(">");
  });

  it("recovers the cited page for the PDF jump", () => {
    expect(evd.page).toBe(7387);
  });

  it("parses What / How / Who from Methods Context, each with its quote", () => {
    const keys = evd.methods.map((m) => m.key);
    expect(keys).toEqual(["what", "how", "who"]);
    const what = evd.methods.find((m) => m.key === "what")!;
    expect(what.summary).toContain("all-cause hospital readmission");
    expect(what.quotes.length).toBeGreaterThanOrEqual(1);
    expect(what.quotes[0]).toContain("Outcomes of interest");
    const how = evd.methods.find((m) => m.key === "how")!;
    expect(how.summary).toContain("logistic regression");
    expect(how.quotes[0]).toContain("logistic regression");
    const who = evd.methods.find((m) => m.key === "who")!;
    expect(who.summary).toContain("1662 patients");
  });

  it("resolves the linked claim with correct polarity", () => {
    expect(evd.claims).toHaveLength(1);
    expect(evd.claims[0]).toMatchObject({
      id: "C-0008",
      polarity: "opposes",
      title: "LEP is associated with worse post-surgical outcomes",
    });
  });

  it("splits caveats into separate items", () => {
    expect(evd.caveats).toHaveLength(2);
    expect(evd.caveats[0]).toContain("Single-site");
  });

  it("does not treat derivedFrom as a claim link", () => {
    expect(evd.claims.find((c) => c.id === "S-0004")).toBeUndefined();
  });
});
