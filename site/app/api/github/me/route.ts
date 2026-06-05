import { NextResponse } from "next/server";

import { clearTokenCookie, readTokenCookie } from "@/lib/github-oauth";
import { AuthExpiredError, getViewer } from "@/lib/github-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = await readTokenCookie();
  if (!token) {
    return NextResponse.json({ authed: false });
  }
  try {
    const user = await getViewer(token);
    return NextResponse.json({ authed: true, login: user.login });
  } catch (err) {
    if (err instanceof AuthExpiredError) {
      await clearTokenCookie();
      return NextResponse.json({ authed: false });
    }
    return NextResponse.json({ authed: false }, { status: 502 });
  }
}
