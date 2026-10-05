import { route } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/me/export — everything stored about the signed-in user, as a JSON
 * download (GDPR right of access / data portability).
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const [applications, saved, dismissed, fitScores, sessions] = await Promise.all([
    sql(
      `SELECT a.status, a.cover_letter, a.notes, a.applied_at, a.created_at, a.updated_at, j.title, j.company
       FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = $1 ORDER BY a.created_at`,
      [user.id],
    ),
    sql("SELECT j.title, j.company, s.created_at FROM saved_jobs s JOIN jobs j ON j.id = s.job_id WHERE s.user_id = $1", [user.id]),
    sql("SELECT j.title, j.company, d.reason, d.created_at FROM job_dismissals d JOIN jobs j ON j.id = d.job_id WHERE d.user_id = $1", [user.id]),
    sql(
      `SELECT j.title, j.company, f.score, f.matched_skills, f.missing_skills, f.breakdown, f.explanation, f.computed_at
       FROM fit_scores f JOIN jobs j ON j.id = f.job_id WHERE f.user_id = $1`,
      [user.id],
    ),
    sql("SELECT created_at, expires_at, user_agent FROM sessions WHERE user_id = $1", [user.id]),
  ]);

  const { password_hash: _p, ...profile } = user;
  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), profile, applications, saved_jobs: saved, dismissed_jobs: dismissed, fit_scores: fitScores, sessions },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fitwise-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
