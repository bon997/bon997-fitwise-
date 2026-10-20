import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: { meta: "Page not found — Fitwise", title: "This page doesn't fit.", body: "The link may be old, or the job may have been removed.", jobs: "Browse jobs", home: "Home" },
  sv: { meta: "Sidan hittades inte — Fitwise", title: "Den här sidan passar inte in.", body: "Länken kan vara gammal, eller så har jobbet tagits bort.", jobs: "Se jobb", home: "Startsida" },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

export default async function NotFound() {
  const t = T[await getLocale()];
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-display text-7xl text-accent">404</p>
        <h1 className="mt-4 font-display text-4xl">{t.title}</h1>
        <p className="mt-3 text-ink-2">{t.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/jobs" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-2">{t.jobs}</Link>
          <Link href="/" className="rounded-full border border-ink/20 px-5 py-3 text-sm hover:border-ink/50">{t.home}</Link>
        </div>
      </div>
    </main>
  );
}
