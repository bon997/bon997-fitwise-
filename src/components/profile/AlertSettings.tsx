"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    title: "Job alerts",
    label: "Email me the best new jobs for me once a week",
    note: "Up to 5 jobs, only when there's something good. Every email has a one-click “turn off” link.",
    off: "Job alert emails aren't switched on for Fitwise yet. Your setting is saved for when they are.",
    confirm: "Confirm your email address to get alerts. We sent a link when you signed up.",
    send: "Send a new link",
    sent: "Sent. Check your inbox (and spam folder).",
    saved: "Saved",
    failed: "Couldn't save. Try again.",
  },
  sv: {
    title: "Jobbtips",
    label: "Mejla mig de bästa nya jobben för mig en gång i veckan",
    note: "Upp till 5 jobb, bara när det finns något bra. Varje mejl har en länk för att stänga av med ett klick.",
    off: "Mejl med jobbtips är inte påslaget på Fitwise än. Ditt val sparas till dess.",
    confirm: "Bekräfta din e-postadress för att få jobbtips. Vi skickade en länk när du registrerade dig.",
    send: "Skicka en ny länk",
    sent: "Skickat. Titta i inkorgen (och skräpposten).",
    saved: "Sparat",
    failed: "Kunde inte spara. Försök igen.",
  },
});

export function AlertSettings({ initial, verified, emailOn }: { initial: boolean; verified: boolean; emailOn: boolean }) {
  const t = T[useLocale()];
  const [on, setOn] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [link, setLink] = useState<"idle" | "busy" | "sent" | string>("idle");

  const toggle = async (next: boolean) => {
    setOn(next);
    setStatus(null);
    const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_alerts: next }) }).catch(() => null);
    if (res?.ok) setStatus(t.saved);
    else {
      setOn(!next);
      setStatus(t.failed);
    }
  };

  const resend = async () => {
    setLink("busy");
    const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    setLink(res?.ok ? "sent" : (body?.error ?? t.failed));
  };

  return (
    <section aria-labelledby="alerts-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="alerts-heading" className="text-lg font-semibold">{t.title}</h2>
      <label className="mt-3 flex items-start gap-3 text-sm">
        <input id="job-alerts" type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
        <span>
          <span className="font-medium">{t.label}</span>
          <span className="mt-0.5 block text-xs text-muted">{t.note}</span>
        </span>
      </label>
      <p aria-live="polite" className="mt-2 min-h-4 text-xs text-muted">{status}</p>
      {!emailOn ? (
        <p className="mt-2 text-xs text-muted">{t.off}</p>
      ) : (
        !verified &&
        on && (
          <div className="mt-2 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
            <p>{t.confirm}</p>
            {link === "sent" ? (
              <p className="mt-1 font-medium">{t.sent}</p>
            ) : (
              <>
                <button type="button" onClick={resend} disabled={link === "busy"} className="mt-1 font-medium underline underline-offset-2 disabled:opacity-60">{t.send}</button>
                {link !== "idle" && link !== "busy" && <p className="mt-1">{link}</p>}
              </>
            )}
          </div>
        )
      )}
    </section>
  );
}
