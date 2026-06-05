import { cookies } from "next/headers";

export const COOKIE_STATE = "gh_oauth_state";
export const COOKIE_RETURN = "gh_oauth_return";
export const COOKIE_TOKEN = "gh_token";

export interface GithubEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
}

export class EnvMissingError extends Error {
  constructor(public missing: string[]) {
    super(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export function readGithubEnv(): GithubEnv {
  const required = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI,
    repoOwner: process.env.GITHUB_REPO_OWNER,
    repoName: process.env.GITHUB_REPO_NAME,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new EnvMissingError(missing);
  return {
    clientId: required.clientId!,
    clientSecret: required.clientSecret!,
    redirectUri: required.redirectUri!,
    repoOwner: required.repoOwner!,
    repoName: required.repoName!,
    baseBranch: process.env.GITHUB_REPO_BASE_BRANCH || "main",
  };
}

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setStateCookie(state: string) {
  const c = await cookies();
  c.set(COOKIE_STATE, state, { ...cookieBase, maxAge: 600 });
}

export async function readStateCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE_STATE)?.value;
}

export async function clearStateCookie() {
  const c = await cookies();
  c.delete(COOKIE_STATE);
}

export async function setReturnCookie(returnPath: string) {
  const c = await cookies();
  c.set(COOKIE_RETURN, returnPath, { ...cookieBase, maxAge: 600 });
}

export async function readReturnCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE_RETURN)?.value;
}

export async function clearReturnCookie() {
  const c = await cookies();
  c.delete(COOKIE_RETURN);
}

export async function setTokenCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_TOKEN, token, { ...cookieBase, maxAge: 3600 });
}

export async function readTokenCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE_TOKEN)?.value;
}

export async function clearTokenCookie() {
  const c = await cookies();
  c.delete(COOKIE_TOKEN);
}

/**
 * Validate a return path: must be a same-origin absolute path. Falls back to
 * "/narratives/generate" if invalid (defense against open-redirect via the
 * `?return=` query param).
 */
export function safeReturnPath(raw: string | undefined | null): string {
  if (!raw) return "/narratives/generate";
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/narratives/generate";
  }
  return raw;
}
