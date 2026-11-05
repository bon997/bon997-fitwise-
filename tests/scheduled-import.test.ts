import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake database and import pipeline: these tests cover the nightly runner's own decisions.
const db = vi.hoisted(() => ({
  searches: [] as Record<string, unknown>[],
  backlog: [] as string[],
  updates: [] as { id: string; note: string }[],
}));
vi.mock("@/lib/db", () => ({
  one: vi.fn(async () => ({ pages: 0 })),
  sql: vi.fn(async (q: string, params: unknown[] = []) => {
    if (q.startsWith("SELECT * FROM import_searches")) return db.searches;
    if (q.startsWith("UPDATE import_searches")) {
      db.updates.push({ id: params[0] as string, note: params[1] as string });
      return [];
    }
    if (q.includes("skills = '[]'::jsonb ORDER BY")) return db.backlog.splice(0, 10).map((id) => ({ id }));
    return []; // hiding expired jobs
  }),
}));
const ingest = vi.hoisted(() => ({
  importJobs: vi.fn(),
  enrichJobs: vi.fn(),
  hideDuplicateJobs: vi.fn(async () => 2),
}));
vi.mock("@/lib/ingest", () => ingest);

import { runScheduledImport, sourceReady, summary } from "@/lib/scheduled-import";

const search = (id: string, source = "jobtech") => ({ id, source, query: `q${id}`, location: null, pages: 1, enabled: true });

beforeEach(() => {
  db.searches = [];
  db.backlog = [];
  db.updates = [];
  ingest.importJobs.mockReset().mockImplementation(async () => ({ runId: "r", fetched: 10, inserted: 4, updated: 6, duplicates: 1, needsEnrich: ["a", "b"] }));
  ingest.enrichJobs.mockReset().mockImplementation(async (ids: string[]) => ({ enriched: ids.length, failed: 0 }));
  vi.stubEnv("ANTHROPIC_API_KEY", "x");
  vi.stubEnv("SERPAPI_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("nightly import", () => {
  it("runs every saved search newest-first and records the result on each", async () => {
    db.searches = [search("1"), search("2")];
    const r = await runScheduledImport();
    expect(ingest.importJobs).toHaveBeenCalledTimes(2);
    expect(ingest.importJobs.mock.calls[0][0]).toMatchObject({ source: "jobtech", query: "q1", newestFirst: true });
    expect(db.updates).toEqual([
      { id: "1", note: "10 found · 4 new · 1 duplicates skipped" },
      { id: "2", note: "10 found · 4 new · 1 duplicates skipped" },
    ]);
    expect(r).toMatchObject({ fetched: 20, inserted: 8, enriched: 4, duplicatesHidden: 2, skipped: 0 });
  });

  it("skips a source whose key isn't set, without failing the others", async () => {
    db.searches = [search("1", "serpapi"), search("2")];
    await runScheduledImport();
    expect(ingest.importJobs).toHaveBeenCalledTimes(1);
    expect(db.updates[0]).toEqual({ id: "1", note: "Skipped: this source's API key isn't set" });
  });

  it("keeps going when one search fails, and says why", async () => {
    db.searches = [search("1"), search("2")];
    ingest.importJobs.mockRejectedValueOnce(new Error("Platsbanken 503: down"));
    const r = await runScheduledImport();
    expect(db.updates[0].note).toBe("Failed: Platsbanken 503: down");
    expect(r.searches).toHaveLength(2);
  });

  it("stops starting searches when the time budget is used, leaving the rest for next night", async () => {
    db.searches = [search("1"), search("2"), search("3")];
    let t = 0;
    ingest.importJobs.mockImplementation(async () => {
      t += 20_000; // each search takes 20 s
      return { runId: "r", fetched: 10, inserted: 1, updated: 0, duplicates: 0, needsEnrich: [] };
    });
    const r = await runScheduledImport({ now: () => t });
    expect(ingest.importJobs).toHaveBeenCalledTimes(2);
    expect(r.skipped).toBe(1);
  });

  it("reads skills for older waiting jobs after the new ones, until none are left", async () => {
    db.searches = [search("1")];
    db.backlog = Array.from({ length: 13 }, (_, i) => `old${i}`);
    const r = await runScheduledImport();
    expect(r.enriched).toBe(2 + 13);
  });

  it("stops reading skills when every job fails (missing key or credit)", async () => {
    db.backlog = Array.from({ length: 30 }, (_, i) => `old${i}`);
    ingest.enrichJobs.mockImplementation(async (ids: string[]) => ({ enriched: 0, failed: ids.length, enrich_error: "credit balance too low" }));
    const r = await runScheduledImport();
    expect(ingest.enrichJobs).toHaveBeenCalledTimes(1);
    expect(r.enrichError).toBe("credit balance too low");
  });

  it("doesn't read skills without an AI key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    db.searches = [search("1")];
    await runScheduledImport();
    expect(ingest.enrichJobs).not.toHaveBeenCalled();
  });
});

describe("helpers", () => {
  it("knows which sources need a key", () => {
    expect(sourceReady("jobtech")).toBe(true);
    expect(sourceReady("serpapi")).toBe(false);
  });
  it("summarises a search result", () => {
    expect(summary({ fetched: 10, inserted: 3, duplicates: 0 })).toBe("10 found · 3 new");
  });
});
