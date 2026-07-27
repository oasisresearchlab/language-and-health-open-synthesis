"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/review/accuracy";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    // shouldCreateUser:false → invite-only. Unknown emails get no code (Supabase
    // returns success without sending, to prevent email enumeration).
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setStage("code");
    setMsg("If your email is on the reviewer roster, a 6-digit code is on its way.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.replace(next);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-heading text-2xl font-semibold">Reviewer sign-in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your invited email. No code arriving? Ask the maintainer to add you.
      </p>

      {stage === "email" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.edu"
            className="w-full rounded-lg border border-border px-3 py-2"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border border-border bg-accent/50 px-3 py-2 font-medium disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 space-y-3">
          <input
            inputMode="numeric"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full rounded-lg border border-border px-3 py-2 font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border border-border bg-accent/50 px-3 py-2 font-medium disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify & enter"}
          </button>
          <button
            type="button"
            onClick={() => setStage("email")}
            className="w-full text-xs text-muted-foreground underline"
          >
            use a different email
          </button>
        </form>
      )}

      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
