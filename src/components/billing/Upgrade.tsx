"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

type PaidPlan = "pro" | "premium";

const T = defineT({
  en: {
    pro: "Upgrade to PRO to unlock AI-powered job recommendations and automated email alerts based on your resume, skills and career goals.",
    premium: "Upgrade to PREMIUM to access advanced AI career tools.",
    title: { pro: "This is a Pro feature", premium: "This is a Premium feature" },
    go: (plan: string, price: number) => `Upgrade to ${plan} — ${price} kr/month`,
    plans: "Compare plans",
    later: "Not now",
    signIn: "Sign in to upgrade",
    working: "Opening checkout…",
    failed: "Couldn't open checkout. Try again, or compare plans.",
    locked: { pro: "Pro", premium: "Premium" },
  },
  sv: {
    pro: "Uppgradera till PRO för AI-drivna jobbrekommendationer och automatiska jobbtips via mejl utifrån ditt CV, dina kompetenser och dina karriärmål.",
    premium: "Uppgradera till PREMIUM för avancerade AI-verktyg för din karriär.",
    title: { pro: "Det här ingår i Pro", premium: "Det här ingår i Premium" },
    go: (plan: string, price: number) => `Uppgradera till ${plan} — ${price} kr/mån`,
    plans: "Jämför planer",
    later: "Inte nu",
    signIn: "Logga in för att uppgradera",
    working: "Öppnar betalning…",
    failed: "Kunde inte öppna betalningen. Försök igen eller jämför planer.",
    locked: { pro: "Pro", premium: "Premium" },
  },
});

/** Prices shown in the dialog; the charged amount comes from Stripe. */
const PRICE: Record<PaidPlan, number> = {
  pro: Number(process.env.NEXT_PUBLIC_PRICE_PRO_SEK ?? 79),
  premium: Number(process.env.NEXT_PUBLIC_PRICE_PREMIUM_SEK ?? 149),
};

/** Start Stripe Checkout for a plan; falls back to the pricing page. */
export async function startCheckout(plan: PaidPlan): Promise<boolean> {
  const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }).catch(() => null);
  const body = await res?.json().catch(() => null);
  if (res?.ok && body?.url) {
    window.location.href = body.url;
    return true;
  }
  return false;
}

/** The upgrade popup (a native modal dialog: focus moves in, Esc closes, the page behind is inert). */
export function UpgradeDialog({ plan, open, onClose, signedIn = true }: { plan: PaidPlan; open: boolean; onClose: () => void; signedIn?: boolean }) {
  const t = T[useLocale()];
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const go = async () => {
    setState("busy");
    if (!(await startCheckout(plan))) setState("failed");
  };

  return (
    <dialog
      ref={ref}
      onClose={() => { setState("idle"); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      aria-labelledby="upgrade-title"
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="p-6">
        <span className="inline-block rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-paper">{t.locked[plan]}</span>
        <h2 id="upgrade-title" className="mt-3 font-display text-2xl">{t.title[plan]}</h2>
        <p className="mt-2 text-sm text-ink-2">{t[plan]}</p>
        {state === "failed" && <p role="alert" className="mt-3 text-sm text-warn">{t.failed}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {signedIn ? (
            <button type="button" onClick={go} disabled={state === "busy"} autoFocus
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60">
              {state === "busy" ? t.working : t.go(plan === "pro" ? "Pro" : "Premium", PRICE[plan])}
            </button>
          ) : (
            <Link href="/login?returnTo=/pricing" className="rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-paper hover:opacity-90">{t.signIn}</Link>
          )}
          <Link href="/pricing" className="rounded-full border border-line px-5 py-3 text-center text-sm hover:border-ink/40">{t.plans}</Link>
          <button type="button" onClick={() => ref.current?.close()} className="py-2 text-sm text-muted hover:text-ink">{t.later}</button>
        </div>
      </div>
    </dialog>
  );
}

/** A locked area: a short teaser and a button that opens the upgrade popup. */
export function LockedTeaser({ plan, title, body, cta }: { plan: PaidPlan; title: string; body: string; cta?: string }) {
  const [open, setOpen] = useState(false);
  const t = T[useLocale()];
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden>🔒</span>{title}
        <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">{t.locked[plan]}</span>
      </p>
      <p className="mt-1 text-xs text-ink-2">{body}</p>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-medium text-accent underline underline-offset-2">
        {cta ?? t.go(plan === "pro" ? "Pro" : "Premium", PRICE[plan])}
      </button>
      <UpgradeDialog plan={plan} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
