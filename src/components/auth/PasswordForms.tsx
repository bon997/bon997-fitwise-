"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    email: "Email",
    send: "Email me a reset link",
    sent: (e: string) => `If ${e} has a Fitwise account, a reset link is on its way. It works for one hour. Check your spam folder if it hasn't arrived in a few minutes.`,
    password: "New password",
    confirm: "Repeat the new password",
    min: "At least 10 characters.",
    mismatch: "The two passwords don't match.",
    save: "Save new password",
    show: "Show",
    hide: "Hide",
    wait: "Please wait…",
    badEmail: "Enter a valid email address.",
    generic: "Something went wrong. Please try again.",
    offline: "Couldn't reach the server. Check your connection and try again.",
  },
  sv: {
    email: "E-post",
    send: "Skicka en återställningslänk",
    sent: (e: string) => `Om ${e} har ett Fitwise-konto är en länk på väg. Den fungerar i en timme. Titta i skräpposten om den inte kommit inom några minuter.`,
    password: "Nytt lösenord",
    confirm: "Upprepa det nya lösenordet",
    min: "Minst 10 tecken.",
    mismatch: "Lösenorden matchar inte.",
    save: "Spara nytt lösenord",
    show: "Visa",
    hide: "Dölj",
    wait: "Vänta…",
    badEmail: "Skriv en giltig e-postadress.",
    generic: "Något gick fel. Försök igen.",
    offline: "Kunde inte nå servern. Kontrollera din anslutning och försök igen.",
  },
});

const field = "mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-accent-soft";
const button = "w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60";

async function post(url: string, body: object, t: (typeof T)["en"]): Promise<{ ok: true; data: { redirect?: string } } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data } : { ok: false, error: data.issues?.[0]?.message ?? data.error ?? t.generic };
  } catch {
    return { ok: false, error: t.offline };
  }
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">{children}</p>;
}

export function ForgotForm() {
  const t = T[useLocale()];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.badEmail);
    setBusy(true);
    setError(null);
    const r = await post("/api/auth/forgot", { email }, t);
    setBusy(false);
    if (r.ok) setSentTo(email.trim());
    else setError(r.error);
  };

  if (sentTo) return <p role="status" className="rounded-lg bg-accent-soft px-3 py-3 text-sm text-accent">{t.sent(sentTo)}</p>;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block text-sm">
        <span className="text-ink-2">{t.email}</span>
        <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus className={field} />
      </label>
      {error && <Alert>{error}</Alert>}
      <button disabled={busy} className={button}>{busy ? t.wait : t.send}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const t = T[useLocale()];
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Take the token out of the address bar so it doesn't linger in history or get shared by accident.
  useEffect(() => {
    window.history.replaceState(null, "", "/reset-password");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError(t.mismatch);
    setBusy(true);
    setError(null);
    const r = await post("/api/auth/reset", { token, password }, t);
    if (r.ok) {
      window.location.href = r.data.redirect ?? "/dashboard";
      return;
    }
    setBusy(false);
    setError(r.error);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block text-sm">
        <span className="flex items-center justify-between text-ink-2">
          {t.password}
          <button type="button" onClick={() => setShow(!show)} className="text-xs text-muted hover:text-ink">{show ? t.hide : t.show}</button>
        </span>
        <input id="new-password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" autoFocus className={field} />
        <span className="mt-1 block text-xs text-muted">{t.min}</span>
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">{t.confirm}</span>
        <input id="confirm-password" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={field} />
      </label>
      {error && <Alert>{error}</Alert>}
      <button disabled={busy} className={button}>{busy ? t.wait : t.save}</button>
    </form>
  );
}
