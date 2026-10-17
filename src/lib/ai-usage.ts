import { sql, one } from "./db";
import { HttpError } from "./http";
import { AI_DAILY_LIMITS, type AiKind } from "./site";

const LABEL: Record<AiKind, string> = {
  cover_letter: "cover letters",
  resume_parse: "resume uploads",
  fit_explain: "fit explanations",
};

/**
 * Reserve one unit of a paid AI action for this user, or throw 429 if today's
 * allowance (rolling 24 hours) is used up. Admins are not limited.
 * Call it right before the Claude request; if that request fails, call refund().
 */
export async function useAiAllowance(user: { id: string; role: string }, kind: AiKind) {
  if (user.role === "admin") return { refund: async () => {} };
  const limit = AI_DAILY_LIMITS[kind];
  // Insert only if under the limit, in one statement, so parallel clicks can't overshoot much.
  const row = await one<{ id: string }>(
    `INSERT INTO ai_usage (user_id, kind)
     SELECT $1, $2
     WHERE (SELECT count(*) FROM ai_usage WHERE user_id = $1 AND kind = $2 AND created_at > now() - interval '24 hours') < $3
     RETURNING id`,
    [user.id, kind, limit],
  );
  if (!row) throw new HttpError(429, `You've reached today's limit of ${limit} ${LABEL[kind]}. It resets within 24 hours.`);
  return { refund: async () => void (await sql("DELETE FROM ai_usage WHERE id = $1", [row.id])) };
}
