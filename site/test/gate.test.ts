import { describe, it, expect } from "vitest";
import { gateDecision, safeInternalPath } from "@/lib/gate";

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

describe("safeInternalPath", () => {
  it("returns a normal relative path unchanged", () => {
    expect(safeInternalPath("/review/queue")).toBe("/review/queue");
  });
  it("rejects an absolute URL to the default", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/review/accuracy");
  });
  it("rejects a protocol-relative URL", () => {
    expect(safeInternalPath("//evil.example")).toBe("/review/accuracy");
  });
  it("rejects a backslash-prefixed trick", () => {
    expect(safeInternalPath("/\\evil.example")).toBe("/review/accuracy");
  });
  it("falls back to the default on null/empty", () => {
    expect(safeInternalPath(null)).toBe("/review/accuracy");
    expect(safeInternalPath("")).toBe("/review/accuracy");
  });
});
