export type GateDecision = "allow" | "redirect-login" | "unauthorized";

const DEFAULT_NEXT = "/review/accuracy";

// Only allow same-origin relative paths as a post-login redirect target.
// Rejects absolute URLs, protocol-relative ("//"), and backslash tricks ("/\").
export function safeInternalPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT;
  if (!next.startsWith("/")) return DEFAULT_NEXT;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_NEXT;
  return next;
}

// Pure gating rule for the review surface. The middleware matcher already limits
// this to /review/* and /api/pdf/*; the default "allow" is defensive.
export function gateDecision(pathname: string, hasUser: boolean): GateDecision {
  if (hasUser) return "allow";
  if (pathname.startsWith("/api/pdf")) return "unauthorized";
  if (pathname.startsWith("/review")) return "redirect-login";
  return "allow";
}
