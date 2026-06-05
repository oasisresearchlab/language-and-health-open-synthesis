import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  EnvMissingError,
  readGithubEnv,
  safeReturnPath,
  setReturnCookie,
  setStateCookie,
} from "@/lib/github-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const returnPath = safeReturnPath(url.searchParams.get("return"));
  const state = crypto.randomBytes(16).toString("hex");

  await setStateCookie(state);
  await setReturnCookie(returnPath);

  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    scope: "public_repo",
    state,
    allow_signup: "true",
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
}
