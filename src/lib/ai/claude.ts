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
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError();
  client ??= new Anthropic();
  return client;
}

export class AiUnavailableError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

type Content = Anthropic.Messages.ContentBlockParam[] | string;

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
  const { $schema: _ignored, ...inputSchema } = z.toJSONSchema(opts.schema) as Record<string, unknown>;

  const res = await claude().messages.create({
    model: opts.model ?? MODELS.smart,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    tools: [
      {
        name: opts.name,
        description: opts.description,
        input_schema: inputSchema as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: opts.name },
    messages: [{ role: "user", content: opts.content }],
  });

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
