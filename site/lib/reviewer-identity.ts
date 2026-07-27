export type ReviewerRow = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  auth_user_id: string | null;
};

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

// Resolve the logged-in user to a roster row: prefer a stamped auth_user_id,
// else a case-insensitive email match. Null when the user is not on the roster.
export function resolveReviewer(
  authUserId: string | null,
  email: string | null,
  roster: ReviewerRow[],
): ReviewerRow | null {
  if (authUserId) {
    const byId = roster.find((r) => r.auth_user_id === authUserId);
    if (byId) return byId;
  }
  const e = normalizeEmail(email);
  if (!e) return null;
  return roster.find((r) => normalizeEmail(r.email) === e) ?? null;
}
