import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { key: "completeness", href: "/review", label: "Completeness" },
  { key: "accuracy", href: "/review/accuracy", label: "Accuracy" },
  { key: "queue", href: "/review/queue", label: "Queue" },
] as const;

export type ReviewTab = (typeof TABS)[number]["key"];

/**
 * Shared wayfinding across the review passes. Replaces the per-page mono eyebrow
 * with a real segmented control. Active tab lifts by tone (white on the muted
 * track) — no shadow, per the Flat-Paper rule.
 */
export function ReviewNav({ active }: { active?: ReviewTab }) {
  return (
    <nav
      aria-label="Review passes"
      className="flex flex-wrap items-center gap-x-1 gap-y-2"
    >
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border border-border bg-card text-primary"
                  : "border border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Link
        href="/review/guide"
        aria-current={active === undefined ? "page" : undefined}
        className={cn(
          "ml-auto rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground",
          active === undefined ? "text-primary" : "text-muted-foreground",
        )}
      >
        Reviewer guide
      </Link>
    </nav>
  );
}
