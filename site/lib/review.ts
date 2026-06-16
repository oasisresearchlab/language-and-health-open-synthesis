import { promises as fs } from "node:fs";
import path from "node:path";

// Reads the precomputed review anchors (utils/build_review_anchors.py → data/review/).
// Local prototype data, gitignored; absent on a plain deploy.
const DIR = path.resolve(process.cwd(), "..", "data", "review");

export interface ReviewEvd {
  title: string;
  finding: string;
  tables: string[];
  figures: string[];
}

export interface AbstractAnchor {
  id: string;
  kind: "abstract";
  text: string;
  linkedEvd: number | null;
  evdConfidence: number;
  linkedCandidate: number | null;
  candConfidence: number;
}

export interface ObjectAnchor {
  id: string;
  kind: "table" | "figure";
  label: string;
  caption: string;
  page: number | null;
  bbox: number[] | null;
  num: string;
  crop: string | null;
  linkedEvds: number[];
}

export interface ReviewPaper {
  citekey: string;
  title: string;
  author: string;
  year: string;
  doi: string;
  pubmedId: string;
  hasPdf: boolean;
  evds: ReviewEvd[];
  candidates: string[];
  abstractAnchors: AbstractAnchor[];
  objectAnchors: ObjectAnchor[];
}

export interface ReviewIndexEntry {
  citekey: string;
  title: string;
  hasPdf: boolean;
  abstractAnchors: number;
  objectAnchors: number;
  evds: number;
  preLinked: number;
}

export async function reviewIndex(): Promise<ReviewIndexEntry[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, "_index.json"), "utf-8"));
  } catch {
    return [];
  }
}

export async function reviewPaper(citekey: string): Promise<ReviewPaper | null> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(DIR, `${citekey}.json`), "utf-8"),
    );
  } catch {
    return null;
  }
}
