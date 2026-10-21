/** Shown the moment a link is clicked, while the next page loads (Next.js loading.tsx). */
export function PageLoading({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-busy="true" className="min-h-dvh">
      <span className="sr-only">Loading… / Laddar…</span>
      {/* thin moving bar at the very top, so a click always gets an instant response */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent-soft">
        <div className="h-full w-1/3 animate-[loadbar_1s_ease-in-out_infinite] bg-accent" />
      </div>
      <div className="h-14 border-b border-line/70" />
      <div className="mx-auto max-w-6xl animate-pulse px-4 pt-8 sm:px-6">
        <div className="h-10 w-56 rounded-lg bg-paper-2" />
        <div className="mt-6 h-28 rounded-2xl bg-paper-2" />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-line bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
