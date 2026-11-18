import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "@/lib/migrations.generated";

const dir = join(__dirname, "..", "db");

describe("embedded migrations", () => {
  it("match db/migrations-*.sql (run `npm run db:migrations` after adding one)", () => {
    const files = readdirSync(dir).filter((f) => /^migrations-.+\.sql$/.test(f)).sort();
    expect(MIGRATIONS.map((m) => m.id)).toEqual(files.map((f) => f.replace(/\.sql$/, "")));
    for (const m of MIGRATIONS) expect(m.sql).toBe(readFileSync(join(dir, `${m.id}.sql`), "utf8"));
  });

  it("are written to be safe to run more than once", () => {
    for (const m of MIGRATIONS) {
      const creates = m.sql.match(/CREATE (UNIQUE )?(TABLE|INDEX)(?! IF NOT EXISTS)/g);
      const adds = m.sql.match(/ADD COLUMN(?! IF NOT EXISTS)/g);
      expect({ id: m.id, creates, adds }).toEqual({ id: m.id, creates: null, adds: null });
    }
  });
});
