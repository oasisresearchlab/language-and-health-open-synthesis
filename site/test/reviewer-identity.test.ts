import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  resolveReviewer,
  type ReviewerRow,
} from "@/lib/reviewer-identity";

const roster: ReviewerRow[] = [
  { id: "r-defne", name: "Defne Altan", role: "fellow", email: "defne@umd.edu", auth_user_id: null },
  { id: "r-joel", name: "Joel Chan", role: "maintainer", email: "joelchan@umd.edu", auth_user_id: "auth-joel" },
];

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Joel@UMD.edu ")).toBe("joel@umd.edu");
  });
  it("handles null/undefined", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("resolveReviewer", () => {
  it("prefers a stamped auth_user_id match", () => {
    expect(resolveReviewer("auth-joel", "someone-else@x.com", roster)?.id).toBe("r-joel");
  });
  it("falls back to case-insensitive email match", () => {
    expect(resolveReviewer(null, "DEFNE@umd.edu", roster)?.id).toBe("r-defne");
  });
  it("returns null when the email is not on the roster", () => {
    expect(resolveReviewer("unknown-auth", "stranger@x.com", roster)).toBeNull();
  });
  it("returns null for an empty email with no id match", () => {
    expect(resolveReviewer(null, "", roster)).toBeNull();
  });
  it("falls back to email when the auth_user_id does not match any row", () => {
    expect(resolveReviewer("no-such-auth", "defne@umd.edu", roster)?.id).toBe("r-defne");
  });
});
