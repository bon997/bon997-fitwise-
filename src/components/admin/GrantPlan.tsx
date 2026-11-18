"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";

/** Admin: give an account a plan by hand (no payment). */
export function GrantPlan({ paywall }: { paywall: boolean }) {
  const sv = useLocale() === "sv";
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("premium");
  const [msg, setMsg] = useState<string | null>(null);
  const field = "rounded-xl border border-line bg-white px-3 py-2.5 text-sm";
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/plan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, plan }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    setMsg(res?.ok ? (sv ? `Klart: ${body.email} har nu ${body.plan}.` : `Done: ${body.email} now has ${body.plan}.`) : (body?.error ?? (sv ? "Misslyckades" : "Failed")));
  };
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="text-lg font-semibold">{sv ? "Planer" : "Plans"}</h2>
      <p className="mt-1 text-sm text-ink-2">
        {paywall
          ? (sv ? "Betalväggen är PÅ: planerna gäller." : "The paywall is ON: plans are enforced.")
          : (sv ? "Betalväggen är AV (beta): alla har alla funktioner. Sätt PAYWALL_ENABLED=true i Vercel för att starta planerna." : "The paywall is OFF (beta): everyone has every feature. Set PAYWALL_ENABLED=true in Vercel to start plans.")}
      </p>
      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="namn@exempel.se" aria-label="Email" className={field} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan" className={field}>
          <option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option>
        </select>
        <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2">{sv ? "Ge plan" : "Give plan"}</button>
      </form>
      {msg && <p role="status" className="mt-2 text-sm text-ink-2">{msg}</p>}
    </section>
  );
}
