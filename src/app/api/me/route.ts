import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { normalizeSkills } from "@/lib/ai/skills";
import { computeResumeScore, SENIORITY } from "@/lib/ai/fit-score";
import { publicUser, num, type UserRow } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/session";
import { deleteResumeFile } from "@/lib/storage";

/** GET /api/me — the signed-in profile. */
export const GET = route(async (req: Request) => ok({ user: publicUser(await requireUser(req)) }));

const Patch = z
  .object({
    name: z.string().trim().min(1).max(120),
    skills: z.array(z.string().max(60)).max(100),
    years_experience: z.number().min(0).max(60).nullable(),
    seniority: z.enum(SENIORITY).nullable(),
    preferences: z
      .object({
        locations: z.array(z.string().max(100)).max(10),
        remote_only: z.boolean(),
        target_titles: z.array(z.string().max(100)).max(10),
        salary_min: z.number().int().min(0).nullable(),
      })
      .partial(),
  })
  .partial()
  .strict();

/**
 * PATCH /api/me — correct parsed skills, set preferences, etc.
 * Any change that affects matching bumps profile_updated_at so scores recompute.
 */
export const PATCH = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Patch.parse(await readJson(req));

  const skills = body.skills ? normalizeSkills(body.skills) : user.skills;
  const years = body.years_experience !== undefined ? body.years_experience : num(user.years_experience);
  const prefs = body.preferences ? { ...user.preferences, ...body.preferences } : user.preferences;
  const affectsMatching =
    body.skills !== undefined || body.years_experience !== undefined || body.seniority !== undefined || body.preferences !== undefined;

  const updated = await one<UserRow>(
    `UPDATE users SET name = $2, skills = $3, years_experience = $4, seniority = $5, preferences = $6,
       resume_score = $7, profile_updated_at = CASE WHEN $8 THEN now() ELSE profile_updated_at END
     WHERE id = $1 RETURNING *`,
    [
      user.id,
      body.name ?? user.name,
      JSON.stringify(skills),
      years,
      body.seniority !== undefined ? body.seniority : user.seniority,
      JSON.stringify(prefs),
      computeResumeScore({ skills, experience: user.experience, yearsExperience: years }),
      affectsMatching,
    ],
  );
  return ok({ user: publicUser(updated!) });
});

const DeleteBody = z.object({ confirm: z.literal("DELETE") });

/**
 * DELETE /api/me { confirm: "DELETE" } — permanently deletes the account and
 * everything linked to it (GDPR right to erasure). Database rows cascade; the
 * stored resume file is removed too.
 */
export const DELETE = route(async (req: Request) => {
  const user = await requireUser(req);
  DeleteBody.parse(await readJson(req));
  if (user.resume_url) await deleteResumeFile(user.resume_url).catch((e) => console.error("resume delete failed", e));
  await one("DELETE FROM users WHERE id = $1 RETURNING id", [user.id]);
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return res;
});
