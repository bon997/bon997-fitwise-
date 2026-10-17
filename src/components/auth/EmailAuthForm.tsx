"use client";

import { useState } from "react";

type Mode = "signin" | "signup";

export function EmailAuthForm({ initialMode, returnTo }: { initialMode: Mode; returnTo: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field =
    "mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, email, password, returnTo } : { email, password, returnTo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.issues?.[0]?.message ?? body.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = body.redirect ?? "/dashboard";
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 rounded-full bg-paper-2 p-1 text-sm" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchTo(m)}
            className={`rounded-full py-2 font-medium transition-colors ${mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <label className="block text-sm">
          <span className="text-ink-2">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" className={field} />
        </label>
      )}
      <label className="block text-sm">
        <span className="text-ink-2">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={field} />
      </label>
      <label className="block text-sm">
        <span className="flex items-center justify-between text-ink-2">
          Password
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-xs text-muted hover:text-ink">
            {showPw ? "Hide" : "Show"}
          </button>
        </span>
        <input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 10 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={field}
        />
        {mode === "signup" && <span className="mt-1 block text-xs text-muted">At least 10 characters.</span>}
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
          {error}
        </p>
      )}

      <button
        disabled={busy}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60"
      >
        {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      {mode === "signin" && (
        <p className="text-center text-xs text-muted">
          Forgot your password? If it&apos;s a Gmail address, use &ldquo;Continue with Google&rdquo; above.
        </p>
      )}
    </form>
  );
}
