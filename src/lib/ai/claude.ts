import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/** Model choices are env-configurable so you can swap without a deploy. */
export const MODELS = {
  /** Resume parsing, cover letters, fit explanations — quality matters. */
  smart: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
  /** Bulk job-post skill extraction at ingest — volume matters. */
  fast: process.env.CLAUDE_FAST_MODEL ?? "claude-haiku-4-5-20251001",
};

let client: Anthropic | null = null;
export function claude(): Anthropic {
  // Trim: keys pasted into hosting dashboards often carry a stray space or newline.
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AiUnavailableError();
  // authToken: null so a stray ANTHROPIC_AUTH_TOKEN can never override the API key.
  client ??= new Anthropic({ apiKey, authToken: null });
  return client;
}

export class AiUnavailableError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

type Content = Anthropic.Messages.ContentBlockParam[] | string;

const noForcedToolChoice = new Set<string>();

/**
 * Ask Claude for structured output. Forces a single tool call whose input
 * schema is derived from the zod schema, then validates the result.
 */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  name: string;
  description: string;
  system: string;
  content: Content;
  model?: string;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const { $schema: _ignored, ...inputSchema } = z.toJSONSchema(opts.schema, { io: "input" }) as Record<string, unknown>;

  const model = opts.model ?? MODELS.smart;
  const tool = {
    name: opts.name,
    description: opts.description,
    input_schema: inputSchema as Anthropic.Messages.Tool.InputSchema,
  };
  const request = (forced: boolean) =>
    claude().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      // Without a forced tool choice, say it plainly so the model still answers through the tool.
      system: forced ? opts.system : `${opts.system}\n\nAlways respond by calling the ${opts.name} tool exactly once. Do not reply with plain text.`,
      tools: [tool],
      tool_choice: forced ? { type: "tool", name: opts.name } : { type: "auto" },
      messages: [{ role: "user", content: opts.content }],
    });

  // Some newer models reject a forced tool_choice; remember that per model and fall back to "auto".
  let res: Anthropic.Messages.Message;
  if (noForcedToolChoice.has(model)) {
    res = await request(false);
  } else {
    try {
      res = await request(true);
    } catch (e) {
      if (!(e instanceof Anthropic.BadRequestError && /tool_choice/i.test(e.message))) throw e;
      noForcedToolChoice.add(model);
      res = await request(false);
    }
  }

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error(`Claude did not return ${opts.name} output (stop_reason: ${res.stop_reason})`);
  }
  return opts.schema.parse(block.input);
}

/** Plain text generation. */
export async function text(opts: { system: string; content: Content; model?: string; maxTokens?: number }) {
  const res = await claude().messages.create({
    model: opts.model ?? MODELS.smart,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });
  return res.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Untrusted text (resumes, job posts) goes inside tags so it is read as data. */
export function asDocument(tag: string, body: string, maxChars = 40_000) {
  const clipped = body.length > maxChars ? body.slice(0, maxChars) + "\n[truncated]" : body;
  return `<${tag}>\n${clipped}\n</${tag}>`;
}
