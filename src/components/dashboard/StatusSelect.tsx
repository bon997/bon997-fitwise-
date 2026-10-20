"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { labels } from "@/lib/format";
import { useLocale } from "@/i18n/client";

export function StatusSelect({ id, status, label }: { id: string; status: string; label: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const change = (next: string) => {
    const prev = value;
    setValue(next);
    start(async () => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setValue(prev);
        setError(true);
        return;
      }
      setError(false);
      router.refresh();
    });
  };

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      disabled={pending}
      aria-label={`${locale === "sv" ? "Status för" : "Status for"} ${label}`}
      className={`rounded-lg border bg-white px-2 py-1 text-xs ${error ? "border-warn" : "border-line"}`}
    >
      {Object.entries(labels(locale).status).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
