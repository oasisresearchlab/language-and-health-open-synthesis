import { cn } from "@/lib/utils";
import type { NodeType } from "@/lib/types";
import { NODE_TYPE_LABEL } from "@/lib/types";

const STYLES: Record<NodeType, string> = {
  question:
    "bg-[color:var(--node-question)]/10 text-[color:var(--node-question)] border-[color:var(--node-question)]/30",
  claim:
    "bg-[color:var(--node-claim)]/10 text-[color:var(--node-claim)] border-[color:var(--node-claim)]/30",
  evidence:
    "bg-[color:var(--node-evidence)]/10 text-[color:var(--node-evidence)] border-[color:var(--node-evidence)]/30",
  method:
    "bg-[color:var(--node-method)]/10 text-[color:var(--node-method)] border-[color:var(--node-method)]/30",
  source:
    "bg-[color:var(--node-source)]/10 text-[color:var(--node-source)] border-[color:var(--node-source)]/30",
  evidencepattern:
    "bg-[color:var(--node-evidencepattern)]/10 text-[color:var(--node-evidencepattern)] border-[color:var(--node-evidencepattern)]/30",
  artifact:
    "bg-[color:var(--node-artifact)]/10 text-[color:var(--node-artifact)] border-[color:var(--node-artifact)]/30",
};

export function NodeBadge({
  type,
  className,
  size = "md",
}: {
  type: NodeType;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-sans uppercase tracking-wider",
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px]"
          : "px-2 py-0.5 text-[11px]",
        STYLES[type],
        className,
      )}
    >
      {NODE_TYPE_LABEL[type]}
    </span>
  );
}
