export type GateDecision = "allow" | "redirect-login" | "unauthorized";

// Pure gating rule for the review surface. The middleware matcher already limits
// this to /review/* and /api/pdf/*; the default "allow" is defensive.
export function gateDecision(pathname: string, hasUser: boolean): GateDecision {
  if (hasUser) return "allow";
  if (pathname.startsWith("/api/pdf")) return "unauthorized";
  if (pathname.startsWith("/review")) return "redirect-login";
  return "allow";
}
