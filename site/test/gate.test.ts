import { describe, it, expect } from "vitest";
import { gateDecision } from "@/lib/gate";

describe("gateDecision", () => {
  it("allows any path when a user is present", () => {
    expect(gateDecision("/review/accuracy", true)).toBe("allow");
    expect(gateDecision("/api/pdf/@Allan_2022", true)).toBe("allow");
  });
  it("401s the pdf API when logged out", () => {
    expect(gateDecision("/api/pdf/@Allan_2022", false)).toBe("unauthorized");
  });
  it("redirects review pages to login when logged out", () => {
    expect(gateDecision("/review", false)).toBe("redirect-login");
    expect(gateDecision("/review/accuracy", false)).toBe("redirect-login");
  });
  it("allows non-gated paths (defensive default)", () => {
    expect(gateDecision("/login", false)).toBe("allow");
    expect(gateDecision("/node/E-1", false)).toBe("allow");
  });
});
