"use client";

import { useState } from "react";
import Link from "next/link";
import { startCheckout } from "./Upgrade";

/** "Upgrade" on the pricing page: Stripe Checkout when signed in, sign-up first otherwise. */
export function PlanButton({ plan, label, signedIn, current, failedText, className }: {
  plan: "pro" | "premium"; label: string; signedIn: boolean; current?: string | null; failedText: string; className: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (current) return <p className={`${className} cursor-default opacity-70`}>{current}</p>;
  if (!signedIn) return <Link href="/signup?returnTo=/pricing" className={className}>{label}</Link>;
  return (
    <>
      <button type="button" disabled={busy} className={`${className} disabled:opacity-60`}
        onClick={async () => { setBusy(true); setFailed(false); if (!(await startCheckout(plan))) { setBusy(false); setFailed(true); } }}>
        {label}
      </button>
      {failed && <p role="alert" className="mt-2 text-center text-xs text-warn">{failedText}</p>}
    </>
  );
}
