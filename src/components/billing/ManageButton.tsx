"use client";

import { useState } from "react";

/** Opens Stripe's Customer Portal (change plan, card, receipts, cancel). */
export function ManageButton({ label, failedText }: { label: string; failedText: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = async () => {
    setBusy(true);
    setFailed(false);
    const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) window.location.href = body.url;
    else { setBusy(false); setFailed(true); }
  };
  return (
    <>
      <button type="button" onClick={open} disabled={busy} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60">{label}</button>
      {failed && <p role="alert" className="mt-2 text-sm text-warn">{failedText}</p>}
    </>
  );
}
