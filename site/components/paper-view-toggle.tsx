import Link from "next/link";
import { FileText, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaperToggleNarrative {
  /** Full unique slug, e.g. "Q-0003-4101288a" */
  slug: string;
  anchorId: string;
  /** "/narratives/Q-0003" for canonical, "/narratives/Q-0003/4101288a" for variants */
  href: string;
  title: string;
  sublabel?: string;
}

export function PaperViewToggle({
  active,
  narratives,
}: {
  active: { kind: "whitepaper" } | { kind: "narrative"; slug: string };
  narratives: PaperToggleNarrative[];
}) {
  return (
    <div className="space-y-2">
      <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        Read as
      </p>
      <div className="flex flex-wrap gap-2">
        <ToggleChip
          href="/narratives"
          active={active.kind === "whitepaper"}
          icon={<FileText className="h-3.5 w-3.5 shrink-0" />}
          label="Original whitepaper"
          sublabel="Source · paper-shaped"
        />
        {narratives.map((n) => (
          <ToggleChip
            key={n.slug}
            href={n.href}
            active={active.kind === "narrative" && active.slug === n.slug}
            icon={<Sparkles className="h-3.5 w-3.5 shrink-0" />}
            label={n.title}
            mono={n.anchorId}
            sublabel={n.sublabel ?? "Composed · anchored"}
          />
        ))}
      </div>
      <div className="pt-6 mt-6 border-t-2 border-border">
        <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Or compose a new one
        </p>
        <ToggleChip
          href="/narratives/generate"
          active={false}
          icon={<Wand2 className="h-3.5 w-3.5 shrink-0" />}
          label="Generate a narrative"
          sublabel="On-demand · any anchor"
        />
      </div>
    </div>
  );
}

function ToggleChip({
  href,
  active,
  icon,
  label,
  sublabel,
  mono,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  mono?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex max-w-xs items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "mt-0.5",
          active ? "text-primary-foreground/90" : "text-primary/80",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block truncate text-sm font-medium leading-tight">
          {label}
        </span>
        {(mono || sublabel) && (
          <span
            className={cn(
              "block text-[11px] leading-tight",
              active
                ? "text-primary-foreground/75"
                : "text-muted-foreground",
            )}
          >
            {mono && <span className="font-mono">{mono}</span>}
            {mono && sublabel && " · "}
            {sublabel}
          </span>
        )}
      </span>
    </Link>
  );
}
