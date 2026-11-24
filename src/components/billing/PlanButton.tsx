"use client";

import { useState } from "react";
import Link from "next/link";
import { startCheckout } from "./Upgrade";
import { useAndroidApp } from "@/components/app/AppShell";

/** "Upgrade" on the pricing page: Stripe Checkout when signed in, sign-up first otherwise. */
export function PlanButton({ plan, period = "month", label, signedIn, current, failedText, className }: {
  plan: "pro" | "premium"; period?: "month" | "quarter" | "year"; label: string; signedIn: boolean; current?: string | null; failedText: string; className: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inApp = useAndroidApp();
  if (current) return <p className={`${className} cursor-default opacity-70`}>{current}</p>;
  // No purchases inside the Play Store app (Google Play payments policy).
  if (inApp) return null;
  if (!signedIn) return <Link href={`/signup?returnTo=${encodeURIComponent(`/pricing?period=${period}`)}`} className={className}>{label}</Link>;
  return (
    <>
      <button type="button" disabled={busy} className={`${className} disabled:opacity-60`}
        onClick={async () => { setBusy(true); setFailed(false); if (!(await startCheckout(plan, period))) { setBusy(false); setFailed(true); } }}>
        {label}
      </button>
      {failed && <p role="alert" className="mt-2 text-center text-xs text-warn">{failedText}</p>}
    </>
  );
}
