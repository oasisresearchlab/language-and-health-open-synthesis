import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared button primitives for the review surfaces. One place that owns the
 * keyboard-first focus ring, a comfortable hit area, and (for toggles) the
 * selected-state plumbing — so panes don't hand-roll <button>s that each miss
 * one of the three. See plans/review-app + the audit's "systemic" note.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

/** Selected-state tones, keyed semantically to the verdict token scale. */
const TONE = {
  correct: "border-verdict-correct/50 bg-verdict-correct/12 text-verdict-correct",
  edit: "border-verdict-edit/50 bg-verdict-edit/12 text-verdict-edit",
  wrong: "border-verdict-wrong/50 bg-verdict-wrong/12 text-verdict-wrong",
  missing: "border-verdict-missing/50 bg-verdict-missing/12 text-verdict-missing",
  primary: "border-primary/50 bg-primary/10 text-primary",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

export type ReviewTone = keyof typeof TONE;

/**
 * Generic review utility button (export, locate, expand…). Adds the shared
 * focus ring; callers set their own size/padding but should keep ≥28px of hit
 * area. `type` defaults to "button" so it never submits a form by accident.
 */
export function ReviewButton({
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded transition-colors",
        FOCUS_RING,
        className,
      )}
      {...props}
    />
  );
}

/**
 * A toggle within a verdict / action group. Announces selected state to
 * assistive tech via `aria-pressed`, so the choice isn't conveyed by color
 * alone (WCAG 4.1.2 + PRODUCT.md "state is never color-only").
 */
export function ReviewToggle({
  pressed,
  tone = "neutral",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed: boolean;
  tone?: ReviewTone;
}) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded border transition-colors",
        FOCUS_RING,
        pressed
          ? TONE[tone]
          : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
