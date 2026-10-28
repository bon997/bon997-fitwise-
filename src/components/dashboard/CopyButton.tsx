"use client";

import { useState } from "react";

/** Copies text to the clipboard; falls back to selecting it when the browser refuses. */
export function CopyButton({ text, label, done, targetId }: { text: string; label: string; done: string; targetId?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = targetId ? document.getElementById(targetId) : null;
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <button type="button" onClick={copy} className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium hover:border-ink/50">
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
