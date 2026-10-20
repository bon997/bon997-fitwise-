"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    generic: "Something went wrong. Please try again.",
    offline: "Couldn't reach the server. Check your connection and try again.",
    signin: "Sign in",
    signup: "Create account",
    name: "Your name",
    email: "Email",
    password: "Password",
    hide: "Hide",
    show: "Show",
    min: "At least 10 characters.",
    wait: "Please wait…",
    forgot: "Forgot your password? If it's a Gmail address, use “Continue with Google” above.",
    needName: "Enter your name.",
    badEmail: "Enter a valid email address.",
  },
  sv: {
    generic: "Något gick fel. Försök igen.",
    offline: "Kunde inte nå servern. Kontrollera din anslutning och försök igen.",
    signin: "Logga in",
    signup: "Skapa konto",
    name: "Ditt namn",
    email: "E-post",
    password: "Lösenord",
    hide: "Dölj",
    show: "Visa",
    min: "Minst 10 tecken.",
    wait: "Vänta…",
    forgot: "Glömt lösenordet? Om det är en Gmail-adress, använd ”Fortsätt med Google” ovan.",
    needName: "Skriv ditt namn.",
    badEmail: "Skriv en giltig e-postadress.",
  },
});

type Mode = "signin" | "signup";

export function EmailAuthForm({ initialMode, returnTo }: { initialMode: Mode; returnTo: string }) {
  const t = T[useLocale()];
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
    if (mode === "signup" && !name.trim()) return setError(t.needName);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.badEmail);
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
        setError(body.issues?.[0]?.message ?? body.error ?? t.generic);
        return;
      }
      window.location.href = body.redirect ?? "/dashboard";
    } catch {
      setError(t.offline);
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
            {m === "signin" ? t.signin : t.signup}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <label className="block text-sm">
          <span className="text-ink-2">{t.name}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" className={field} />
        </label>
      )}
      <label className="block text-sm">
        <span className="text-ink-2">{t.email}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={field} />
      </label>
      <label className="block text-sm">
        <span className="flex items-center justify-between text-ink-2">
          {t.password}
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-xs text-muted hover:text-ink">
            {showPw ? t.hide : t.show}
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
        {mode === "signup" && <span className="mt-1 block text-xs text-muted">{t.min}</span>}
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
        {busy ? t.wait : mode === "signup" ? t.signup : t.signin}
      </button>

      {mode === "signin" && (
        <p className="text-center text-xs text-muted">
          {t.forgot}
        </p>
      )}
    </form>
  );
}
