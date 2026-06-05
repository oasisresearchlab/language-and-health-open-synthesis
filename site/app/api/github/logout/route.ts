import { NextResponse } from "next/server";

import { clearTokenCookie } from "@/lib/github-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearTokenCookie();
  return NextResponse.json({ ok: true });
}
