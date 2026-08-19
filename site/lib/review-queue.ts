import { accuracyPaper, ACCURACY_BATCH } from "./review-accuracy";

// Server-side: node_id → display context, so the maintainer queue can show titles
// next to the raw review rows (which only carry node_id + citekey).
export interface NodeMeta {
  title: string;
  citekey: string;
  paperTitle: string;
}

export async function queueNodeMeta(): Promise<Record<string, NodeMeta>> {
  const out: Record<string, NodeMeta> = {};
  for (const ck of ACCURACY_BATCH) {
    const p = await accuracyPaper(ck);
    if (!p) continue;
    for (const e of p.evds) {
      out[e.id] = { title: e.title, citekey: ck, paperTitle: p.title };
    }
  }
  return out;
}
