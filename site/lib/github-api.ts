/**
 * Minimal GitHub REST client for the contribution flow. Raw fetch — no
 * octokit dep. Each function performs one round-trip and surfaces typed
 * errors. The caller (the contribute route) handles sequencing.
 */

const GH_API = "https://api.github.com";

export class GithubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export class AuthExpiredError extends Error {
  constructor() {
    super("github auth expired");
  }
}

interface GhFetchOpts {
  token: string;
  method?: string;
  body?: unknown;
}

async function gh<T>(path: string, opts: GhFetchOpts): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) throw new AuthExpiredError();
  if (!res.ok) {
    const detail = await res.json().catch(() => undefined);
    throw new GithubApiError(
      `GitHub ${opts.method ?? "GET"} ${path} → ${res.status}`,
      res.status,
      detail,
    );
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export async function getViewer(token: string): Promise<GithubUser> {
  return gh<GithubUser>("/user", { token });
}

// ---------------------------------------------------------------------------

interface RepoSummary {
  fork: boolean;
  default_branch: string;
}

/**
 * Returns true if the user already has a fork at {login}/{name}; false if
 * not (404). Other errors propagate.
 */
export async function hasFork(
  token: string,
  login: string,
  name: string,
): Promise<boolean> {
  try {
    await gh<RepoSummary>(`/repos/${login}/${name}`, { token });
    return true;
  } catch (err) {
    if (err instanceof GithubApiError && err.status === 404) return false;
    throw err;
  }
}

/**
 * Trigger a fork. GitHub's fork API is async — it returns 202 immediately,
 * but the fork may take a few seconds to be ready for writes.
 */
export async function createFork(
  token: string,
  upstreamOwner: string,
  upstreamName: string,
): Promise<void> {
  await fetch(`${GH_API}/repos/${upstreamOwner}/${upstreamName}/forks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  }).then(async (res) => {
    if (res.status === 401) throw new AuthExpiredError();
    if (!res.ok && res.status !== 202) {
      const detail = await res.json().catch(() => undefined);
      throw new GithubApiError(
        `GitHub POST /forks → ${res.status}`,
        res.status,
        detail,
      );
    }
  });
}

/** Poll the user's fork until it's ready for writes (or give up). */
export async function waitForFork(
  token: string,
  login: string,
  name: string,
  attempts = 5,
  delayMs = 2000,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      // A fork is ready when we can read its default branch ref.
      const repo = await gh<RepoSummary>(`/repos/${login}/${name}`, { token });
      await gh(`/repos/${login}/${name}/git/ref/heads/${repo.default_branch}`, {
        token,
      });
      return;
    } catch (err) {
      if (err instanceof AuthExpiredError) throw err;
      if (i === attempts - 1) {
        throw new GithubApiError(
          `Fork ${login}/${name} not ready after ${attempts} attempts`,
          504,
        );
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// ---------------------------------------------------------------------------

interface GitRef {
  ref: string;
  object: { sha: string; type: string };
}

export async function getBranchSha(
  token: string,
  login: string,
  name: string,
  branch: string,
): Promise<string> {
  const ref = await gh<GitRef>(
    `/repos/${login}/${name}/git/ref/heads/${branch}`,
    { token },
  );
  return ref.object.sha;
}

export async function createBranch(
  token: string,
  login: string,
  name: string,
  branch: string,
  fromSha: string,
): Promise<void> {
  await gh(`/repos/${login}/${name}/git/refs`, {
    token,
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha: fromSha },
  });
}

// ---------------------------------------------------------------------------

interface PutContentsResponse {
  commit: { sha: string; html_url: string };
  content: { path: string; html_url: string };
}

export async function putFile(
  token: string,
  login: string,
  name: string,
  filePath: string,
  branch: string,
  message: string,
  contentUtf8: string,
  /** Required when updating an existing file (PUT to /contents wants the
   * blob SHA of the file being replaced). Omit for net-new files. */
  sha?: string,
): Promise<PutContentsResponse> {
  const contentB64 = Buffer.from(contentUtf8, "utf-8").toString("base64");
  const body: Record<string, unknown> = {
    message,
    content: contentB64,
    branch,
  };
  if (sha) body.sha = sha;
  return gh<PutContentsResponse>(
    `/repos/${login}/${name}/contents/${filePath}`,
    {
      token,
      method: "PUT",
      body,
    },
  );
}

interface GetContentsResponse {
  type: string;
  /** base64-encoded — when encoding is "base64". */
  content: string;
  encoding: string;
  sha: string;
  path: string;
}

/**
 * Read a file from a fork at a given branch. Returns null on 404 — used to
 * detect net-new vs. existing files when applying reciprocal-edge updates.
 */
export async function getFile(
  token: string,
  login: string,
  name: string,
  filePath: string,
  branch: string,
): Promise<{ content: string; sha: string } | null> {
  try {
    const res = await gh<GetContentsResponse>(
      `/repos/${login}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
      { token },
    );
    if (res.type !== "file" || res.encoding !== "base64") return null;
    const content = Buffer.from(res.content, "base64").toString("utf-8");
    return { content, sha: res.sha };
  } catch (err) {
    if (err instanceof GithubApiError && err.status === 404) return null;
    throw err;
  }
}
