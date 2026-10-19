import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("AI output schemas", () => {
  it("trim long lists instead of rejecting them, and still produce a JSON schema", () => {
    const s = z.object({ r: z.array(z.string()).describe("Up to 2").transform((xs) => xs.slice(0, 2)) });
    expect(s.parse({ r: ["a", "b", "c"] }).r).toEqual(["a", "b"]);
    const json = z.toJSONSchema(s, { io: "input" }) as unknown as { properties: { r: { type: string } } };
    expect(json.properties.r.type).toBe("array");
  });
});
