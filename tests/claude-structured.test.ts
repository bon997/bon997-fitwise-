import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

describe("structured() tool_choice fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retries with tool_choice auto when the model rejects a forced tool", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const bodies: { tool_choice: { type: string } }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      if (bodies.length === 1) {
        return new Response(
          JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: 'tool_choice: type "tool" and "any" are not supported for this model.' } }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
          content: [{ type: "tool_use", id: "t", name: "save", input: { ok: true } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }));
    const { structured } = await import("@/lib/ai/claude");
    const out = await structured({ schema: z.object({ ok: z.boolean() }), name: "save", description: "d", system: "s", content: "c", model: "model-x" });
    expect(out).toEqual({ ok: true });
    expect(bodies.map((b) => b.tool_choice.type)).toEqual(["tool", "auto"]);
  });
});
