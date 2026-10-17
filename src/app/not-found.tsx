import Link from "next/link";

export const metadata = { title: "Page not found — Fitwise" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-display text-7xl text-accent">404</p>
        <h1 className="mt-4 font-display text-4xl">This page doesn&apos;t fit.</h1>
        <p className="mt-3 text-ink-2">The link may be old, or the job may have been removed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/jobs" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-2">Browse jobs</Link>
          <Link href="/" className="rounded-full border border-ink/20 px-5 py-3 text-sm hover:border-ink/50">Home</Link>
        </div>
      </div>
    </main>
  );
}
