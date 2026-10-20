"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    error: "Could not delete the account. Please try again.",
    title: "Your data",
    intro: "Your resume and profile are only used to match you with jobs. You can take a copy or delete everything at any time.",
    download: "Download my data",
    safe: "How we keep it safe",
    del: "Delete my account",
    warning: "This permanently deletes your profile, resume, applications and saved jobs. It can't be undone. Type",
    toConfirm: "to confirm.",
    typeLabel: "Type DELETE to confirm",
    deleting: "Deleting…",
    forever: "Delete forever",
    cancel: "Cancel",
  },
  sv: {
    error: "Kunde inte radera kontot. Försök igen.",
    title: "Din data",
    intro: "Ditt CV och din profil används bara för att matcha dig med jobb. Du kan ladda ner en kopia eller radera allt när du vill.",
    download: "Ladda ner min data",
    safe: "Så skyddar vi den",
    del: "Radera mitt konto",
    warning: "Det här raderar permanent din profil, ditt CV, dina ansökningar och sparade jobb. Det går inte att ångra. Skriv",
    toConfirm: "för att bekräfta.",
    typeLabel: "Skriv DELETE för att bekräfta",
    deleting: "Raderar…",
    forever: "Radera för alltid",
    cancel: "Avbryt",
  },
});

/** GDPR controls: download everything we store, or delete the account for good. */
export function DataControls() {
  const t = T[useLocale()];
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: text }),
    });
    if (res.status === 204) {
      window.location.href = "/";
      return;
    }
    setBusy(false);
    setError(t.error);
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-ink-2">{t.intro} <a href="/faq#privacy" className="text-accent underline underline-offset-2">{t.safe}</a></p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/api/me/export" className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">{t.download}</a>
        {!confirming && (
          <button onClick={() => setConfirming(true)} className="rounded-full px-4 py-2 text-sm text-warn hover:bg-warn-soft">
            {t.del}
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn-soft/50 p-4">
          <p className="text-sm">
            {t.warning} <strong>DELETE</strong> {t.toConfirm}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label={t.typeLabel}
              className="w-40 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/40" />
            <button onClick={remove} disabled={text !== "DELETE" || busy}
              className="rounded-full bg-warn px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
              {busy ? t.deleting : t.forever}
            </button>
            <button onClick={() => { setConfirming(false); setText(""); }} className="px-2 text-sm text-muted hover:text-ink">{t.cancel}</button>
          </div>
          {error && <p className="mt-2 text-sm text-warn">{error}</p>}
        </div>
      )}
    </section>
  );
}
