import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { parseResume, ACCEPTED_RESUME_TYPES } from "@/lib/ai/parse-resume";
import { storeResume } from "@/lib/storage";
import { useAiAllowance } from "@/lib/ai-usage";
import { publicUser, type UserRow } from "@/lib/data";

export const maxDuration = 60;
// Vercel rejects request bodies over 4.5 MB before our code runs, so stay under that.
const MAX_BYTES = 4 * 1024 * 1024;

const BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

/**
 * POST /api/resume  multipart/form-data, field "file" (PDF, DOCX or TXT, ≤ 4 MB)
 * Parses with Claude, saves skills/experience, and marks fit scores stale.
 * Returns the updated profile plus suggested roles and resume improvements.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Expected multipart/form-data with a 'file' field");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Missing 'file'");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Resume must be 4 MB or smaller");
  const dot = file.name.toLowerCase().split(".").pop() ?? "";
  if (dot === "doc") throw new HttpError(415, "Old Word files (.doc) can't be read. In Word, choose File → Save As → .docx or PDF, then upload that.");
  // Some browsers send an empty or generic type; fall back to the file extension.
  const mimeType = file.type in ACCEPTED_RESUME_TYPES ? file.type : BY_EXTENSION[dot] ?? file.type;
  const ext = ACCEPTED_RESUME_TYPES[mimeType as keyof typeof ACCEPTED_RESUME_TYPES];
  if (!ext) throw new HttpError(415, "Upload a PDF, Word (.docx) or text file");

  const bytes = Buffer.from(await file.arrayBuffer());
  const allowance = await useAiAllowance(user, "resume_parse");
  const [{ parsed, text }, resumeUrl] = await Promise.all([
    parseResume({ bytes, mimeType }).catch(async (e) => {
      await allowance.refund();
      console.error("resume parse failed", e);
      // Say what went wrong (it is the user's own file); never a stack trace.
      const reason = e instanceof Error ? e.message.slice(0, 200) : "unknown error";
      throw new HttpError(422, `We couldn't read this resume: ${reason}`);
    }),
    // Keeping the original file is optional; a storage problem shouldn't block reading the resume.
    storeResume(user.id, bytes, mimeType, ext).catch((e) => {
      console.error("resume storage failed", e);
      return null;
    }),
  ]);

  const prefs = { ...user.preferences, suggested_roles: parsed.suggested_roles };
  if (!prefs.target_titles?.length) prefs.target_titles = parsed.suggested_roles.slice(0, 3);

  const updated = await one<UserRow>(
    `UPDATE users SET
       name = coalesce(name, $2), resume_url = coalesce($3, resume_url), resume_text = $4,
       skills = $5, experience = $6, years_experience = $7, seniority = $8,
       resume_score = $9, preferences = $10, profile_updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      user.id, parsed.name, resumeUrl, text, JSON.stringify(parsed.skills), JSON.stringify(parsed.experience),
      parsed.years_experience, parsed.seniority, parsed.resume_score, JSON.stringify(prefs),
    ],
  );

  return ok({
    user: publicUser(updated!),
    suggested_roles: parsed.suggested_roles,
    improvements: parsed.improvements,
  });
});
