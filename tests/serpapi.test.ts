import { afterEach, describe, expect, it, vi } from "vitest";
import { searchSerpApi } from "@/lib/sources/serpapi";

const job = { job_id: "j1", title: "Logistics Coordinator", company_name: "Acme", location: "Göteborg" };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("searchSerpApi location fallback", () => {
  afterEach(() => vi.unstubAllGlobals());
  process.env.SERPAPI_KEY = "test";

  it("retries with the place in the query when the location name is rejected", async () => {
    const calls: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: URL) => {
      calls.push(new URL(u));
      return calls.length === 1
        ? new Response('{"error":"Unsupported `Göteborg` location - location parameter."}', { status: 400 })
        : ok({ jobs_results: [job] });
    }));
    const res = await searchSerpApi({ query: "logistics coordinator", location: "Göteborg" });
    expect(res.jobs).toHaveLength(1);
    expect(calls[1].searchParams.get("q")).toBe("logistics coordinator Göteborg");
    expect(calls[1].searchParams.has("location")).toBe(false);
  });

  it("retries when the location returns nothing", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (++n === 1 ? ok({ error: "Google hasn't returned any results for this query." }) : ok({ jobs_results: [job] }))));
    const res = await searchSerpApi({ query: "logistics coordinator", location: "Stockholm" });
    expect(n).toBe(2);
    expect(res.jobs[0].title).toBe("Logistics Coordinator");
  });

  it("does not retry other errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"Invalid API key."}', { status: 401 })));
    await expect(searchSerpApi({ query: "x", location: "Stockholm" })).rejects.toThrow(/401/);
  });
});
