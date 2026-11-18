/** Runs once when a server instance starts (Next.js instrumentation hook). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL || process.env.SKIP_MIGRATIONS === "true") return;
  const { migrate } = await import("./lib/migrate");
  // Never hold the server back for long: after 15 s it starts anyway and the migration finishes in the background.
  await Promise.race([migrate(), new Promise((r) => setTimeout(r, 15_000))]);
}
