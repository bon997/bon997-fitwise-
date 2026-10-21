"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

/**
 * "Choose from Google Drive": Google's own file picker, then the file is downloaded in the
 * browser and handed to the normal upload. Uses the drive.file scope, so we can only open the
 * one file the person picks, nothing else in their Drive.
 * Setup (Google Cloud): Picker API + Drive API enabled, an API key, the project number,
 * and the site's address under the OAuth client's "Authorized JavaScript origins".
 */
export type DriveConfig = { apiKey: string; clientId: string; appId: string };

const T = defineT({
  en: {
    button: "Choose from Google Drive",
    opening: "Opening Google Drive…",
    downloading: "Getting the file from Drive…",
    failed: "Couldn't open Google Drive. Try again, or download the file and upload it from your computer.",
    blocked: "Google sign-in was closed or blocked. Allow pop-ups for this site and try again.",
  },
  sv: {
    button: "Välj från Google Drive",
    opening: "Öppnar Google Drive…",
    downloading: "Hämtar filen från Drive…",
    failed: "Det gick inte att öppna Google Drive. Försök igen, eller ladda ner filen och ladda upp den från datorn.",
    blocked: "Google-inloggningen stängdes eller blockerades. Tillåt popup-fönster för sidan och försök igen.",
  },
});

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const GDOC = "application/vnd.google-apps.document";
const TXT = "text/plain";

/* Google's scripts are untyped globals; keep the surface we use small and explicit. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
declare global {
  interface Window {
    gapi?: Any;
    google?: Any;
  }
}

const loaded = new Map<string, Promise<void>>();
function loadScript(src: string) {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          loaded.delete(src);
          reject(new Error(`Could not load ${src}`));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return loaded.get(src)!;
}

async function loadPicker() {
  await Promise.all([loadScript("https://apis.google.com/js/api.js"), loadScript("https://accounts.google.com/gsi/client")]);
  await new Promise<void>((resolve) => window.gapi.load("picker", { callback: resolve }));
}

/** Short-lived token for only the files the person picks (drive.file). Kept in memory, never stored. */
let token: { value: string; expires: number } | null = null;
function getToken(clientId: string, hint?: string): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return Promise.resolve(token.value);
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      hint,
      callback: (r: Any) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? "no_token"));
        token = { value: r.access_token, expires: Date.now() + Number(r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e: Any) => reject(new Error(e?.type ?? "popup_closed")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export function DrivePicker({
  config,
  disabled,
  onFile,
  onError,
}: {
  config: DriveConfig;
  disabled?: boolean;
  onFile: (file: File) => void;
  onError: (message: string) => void;
}) {
  const locale = useLocale();
  const t = T[locale];
  const [busy, setBusy] = useState<null | "open" | "download">(null);

  const pick = async () => {
    setBusy("open");
    try {
      await loadPicker();
      const accessToken = await getToken(config.clientId);
      const { picker } = window.google;
      const view = new picker.DocsView(picker.ViewId.DOCS)
        .setMimeTypes([PDF, DOCX, GDOC, TXT].join(","))
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);
      const chosen = await new Promise<Any | null>((resolve) => {
        new picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(accessToken)
          .setDeveloperKey(config.apiKey)
          .setAppId(config.appId)
          .setLocale(locale)
          .setCallback((data: Any) => {
            if (data.action === picker.Action.PICKED) resolve(data.docs?.[0] ?? null);
            if (data.action === picker.Action.CANCEL) resolve(null);
          })
          .build()
          .setVisible(true);
      });
      if (!chosen) return;

      setBusy("download");
      // A Google Doc has no file to download, so ask Drive for a PDF copy of it.
      const isGdoc = chosen.mimeType === GDOC;
      const url = isGdoc
        ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(chosen.id)}/export?mimeType=${encodeURIComponent(PDF)}`
        : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(chosen.id)}?alt=media`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`Drive ${res.status}`);
      const blob = await res.blob();
      const name = isGdoc ? `${chosen.name || "resume"}.pdf` : chosen.name || "resume";
      onFile(new File([blob], name, { type: isGdoc ? PDF : chosen.mimeType || blob.type }));
    } catch (e) {
      const msg = (e as Error).message;
      onError(/popup|closed|access_denied/i.test(msg) ? t.blocked : t.failed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <button
      type="button"
      onClick={pick}
      disabled={disabled || busy !== null}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium hover:border-ink/40 disabled:opacity-60"
    >
      <svg aria-hidden viewBox="0 0 87.3 78" className="h-4 w-4">
        <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" />
        <path fill="#00ac47" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" />
        <path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" />
        <path fill="#00832d" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" />
        <path fill="#2684fc" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
        <path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" />
      </svg>
      {busy === "open" ? t.opening : busy === "download" ? t.downloading : t.button}
    </button>
  );
}
