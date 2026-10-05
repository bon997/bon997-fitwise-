"use client";

import { useState } from "react";

/** GDPR controls: download everything we store, or delete the account for good. */
export function DataControls() {
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
    setError("Could not delete the account. Please try again.");
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Your data</h2>
      <p className="mt-1 text-sm text-ink-2">Your resume and profile are only used to match you with jobs. You can take a copy or delete everything at any time.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/api/me/export" className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">Download my data</a>
        {!confirming && (
          <button onClick={() => setConfirming(true)} className="rounded-full px-4 py-2 text-sm text-warn hover:bg-warn-soft">
            Delete my account
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn-soft/50 p-4">
          <p className="text-sm">
            This permanently deletes your profile, resume, applications and saved jobs. It can&apos;t be undone. Type <strong>DELETE</strong> to confirm.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Type DELETE to confirm"
              className="w-40 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/40" />
            <button onClick={remove} disabled={text !== "DELETE" || busy}
              className="rounded-full bg-warn px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
              {busy ? "Deleting…" : "Delete forever"}
            </button>
            <button onClick={() => { setConfirming(false); setText(""); }} className="px-2 text-sm text-muted hover:text-ink">Cancel</button>
          </div>
          {error && <p className="mt-2 text-sm text-warn">{error}</p>}
        </div>
      )}
    </section>
  );
}
