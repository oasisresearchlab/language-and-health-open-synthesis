import { NextResponse } from "next/server";

import {
  clearReturnCookie,
  clearStateCookie,
  EnvMissingError,
  readGithubEnv,
  readReturnCookie,
  readStateCookie,
  safeReturnPath,
  setTokenCookie,
} from "@/lib/github-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appendQuery(path: string, key: string, value: string): string {
  const [base, query] = path.split("?", 2);
  const sp = new URLSearchParams(query ?? "");
  sp.set(key, value);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function GET(request: Request) {
  let env;
  try {
    env = readGithubEnv();
  } catch (err) {
    if (err instanceof EnvMissingError) {
      return new Response(err.message, { status: 500 });
    }
    throw err;
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const queryState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const returnPath = safeReturnPath(await readReturnCookie());
  const cookieState = await readStateCookie();
  await clearStateCookie();
  await clearReturnCookie();

  if (errorParam) {
    return NextResponse.redirect(
      new URL(appendQuery(returnPath, "error", "auth_denied"), request.url),
    );
  }
  if (!code || !queryState || !cookieState || queryState !== cookieState) {
    return new Response("invalid oauth state", { status: 400 });
  }

  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.clientId,
        client_secret: env.clientSecret,
        code,
        redirect_uri: env.redirectUri,
      }),
      cache: "no-store",
    },
  );
  if (!tokenRes.ok) {
    return new Response("token exchange failed", { status: 502 });
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(
      new URL(
        appendQuery(returnPath, "error", tokenJson.error ?? "token_missing"),
        request.url,
      ),
    );
  }

  await setTokenCookie(tokenJson.access_token);

  return NextResponse.redirect(
    new URL(appendQuery(returnPath, "resume", "1"), request.url),
  );
}
