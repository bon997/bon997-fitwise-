import { one, sql } from "./db";
import { profileText } from "./matching";
import { can, FREE_PREVIEWS, INTERVIEW_PREVIEW_QUESTIONS } from "./plans";
import { countReports, getReport } from "./ai-reports";
import { previewPack, type InterviewPack, type MockQuestion, type MockSummary, type TurnResult, type CandidateContext, type JobContext } from "./agents/interview";
import type { UserRow, JobRow } from "./data";

export const candidateContext = (u: UserRow): CandidateContext => ({
  profileText: u.resume_text || profileText(u),
  years: u.years_experience == null ? null : Number(u.years_experience),
  seniority: u.seniority,
});

export const jobContext = (j: JobRow): JobContext => ({
  title: j.title, company: j.company, description: j.description, requirements: j.requirements, skills: j.skills.map((s) => s.name),
});

/** full = Premium · preview = may make one pack and see the first questions · locked = preview used up. */
export type CoachAccess = "full" | "preview" | "locked";

export async function coachAccess(user: UserRow, jobId: string): Promise<{ access: CoachAccess; pack: InterviewPack | null }> {
  const stored = await getReport<InterviewPack>(user.id, jobId, "interview");
  if (can(user, "interview_coach")) return { access: "full", pack: stored?.content ?? null };
  if (stored) return { access: "preview", pack: stored.content };
  const used = await countReports(user.id, "interview");
  return { access: used < FREE_PREVIEWS.interview_coach ? "preview" : "locked", pack: null };
}

/** What a user may see of a pack. */
export const visiblePack = (pack: InterviewPack, access: CoachAccess) =>
  access === "full" ? { ...pack, locked_questions: 0 } : previewPack(pack, INTERVIEW_PREVIEW_QUESTIONS);

export type Turn = TurnResult & { answer: string };
export type SessionRow = {
  id: string; user_id: string; job_id: string; questions: MockQuestion[]; turns: Turn[];
  score: number | null; summary: MockSummary | null; locale: string; created_at: Date;
};

export const publicSession = (s: SessionRow) => ({
  id: s.id, job_id: s.job_id, questions: s.questions, turns: s.turns, score: s.score, summary: s.summary,
  done: s.turns.length >= s.questions.length, created_at: s.created_at,
});
export type PublicSession = ReturnType<typeof publicSession>;

export const getSession = (id: string, userId: string) =>
  one<SessionRow>("SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2", [id, userId]);

/** The user's most recent finished practice interview, for the readiness score. */
export async function latestReadiness(userId: string, jobId?: string) {
  const [row] = await sql<{ score: number; job_id: string; title: string }>(
    `SELECT s.score, s.job_id, j.title FROM interview_sessions s JOIN jobs j ON j.id = s.job_id
     WHERE s.user_id = $1 AND s.score IS NOT NULL ${jobId ? "AND s.job_id = $2" : ""}
     ORDER BY s.updated_at DESC LIMIT 1`,
    jobId ? [userId, jobId] : [userId],
  );
  return row ?? null;
}
