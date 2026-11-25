import { createHash } from "node:crypto";
import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { getUserId } from "@/lib/auth";
import { one, sql } from "@/lib/db";
import { HELP_LIMITS } from "@/lib/site";
import { answerHelp } from "@/lib/ai/help-answer";
import { say } from "@/i18n/server";

export const maxDuration = 30;

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1500),
  })).min(1).max(12).refine((m) => m[m.length - 1].role === "user", "The last message must be the user's"),
});

/** Signed-in users are counted by id; visitors by a hash of their IP (the IP itself is never stored). */
function visitorKey(req: Request, userId: string | null) {
  if (userId) return `u:${userId}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${createHash("sha256").update(`fitwise-help:${ip}`).digest("hex").slice(0, 40)}`;
}

/** POST /api/help { messages } → { answer }. The help assistant; works signed in or not. */
export const POST = route(async (req: Request) => {
  const body = Body.parse(await readJson(req));
  const who = visitorKey(req, await getUserId(req));

  const row = await one<{ id: string }>(
    `INSERT INTO help_usage (who)
     SELECT $1
     WHERE (SELECT count(*) FROM help_usage WHERE who = $1 AND created_at > now() - interval '24 hours') < $2
       AND (SELECT count(*) FROM help_usage WHERE created_at > now() - interval '24 hours') < $3
     RETURNING id`,
    [who, HELP_LIMITS.perVisitor, HELP_LIMITS.total],
  );
  if (!row) {
    throw new HttpError(429, say(req,
      "The help assistant has answered a lot today. Please try again tomorrow, or read the FAQ at /faq.",
      "Hjälpassistenten har svarat mycket i dag. Försök igen i morgon, eller läs vanliga frågor på /faq."));
  }
  try {
    return ok({ answer: await answerHelp(body.messages.slice(-8)) });
  } catch (e) {
    await sql("DELETE FROM help_usage WHERE id = $1", [row.id]);
    throw e;
  }
});
