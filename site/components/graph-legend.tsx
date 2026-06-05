import { NODE_TYPES, EDGE_TYPES, NODE_TYPE_LABEL, EDGE_LABEL } from "@/lib/types";

const kebab = (s: string) =>
  s.replace(/[A-Z]/g, (m, i) => (i === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));

export function GraphLegend() {
  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">
          Node types
        </p>
        <ul className="space-y-1.5">
          {NODE_TYPES.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: `var(--node-${t})` }}
              />
              <span>{NODE_TYPE_LABEL[t]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">
          Edge types
        </p>
        <ul className="space-y-1.5">
          {EDGE_TYPES.map((e) => (
            <li key={e} className="flex items-center gap-2">
              <span
                className="h-0.5 w-5"
                style={{ backgroundColor: `var(--edge-${kebab(e)})` }}
              />
              <span className="capitalize">{EDGE_LABEL[e]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
