import { text, MODELS } from "./claude";
import type { FitResult } from "./fit-score";

/** One short paragraph explaining a fit score in plain language (shown on the job details page). */
export type FitForExplanation = Pick<FitResult, "score" | "matchedSkills" | "missingSkills" | "partialSkills" | "missingRequired" | "breakdown">;

export async function explainFit(opts: { jobTitle: string; company: string; fit: FitForExplanation }): Promise<string> {
  const { fit } = opts;
  return text({
    system:
      "You explain job-fit scores to job seekers in 2–3 plain sentences. Be specific and encouraging but honest. No markdown, no preamble.",
    content: `Role: ${opts.jobTitle} at ${opts.company}
Score: ${fit.score}/100
Parts (0–100, null = the ad says nothing): skills ${fit.breakdown.skills} (weight 40), experience ${fit.breakdown.experience} (30), education ${fit.breakdown.education} (20), location & work type ${fit.breakdown.location} (10)
Matched skills: ${fit.matchedSkills.join(", ") || "none"}
Related (partial credit): ${fit.partialSkills.join(", ") || "none"}
Missing skills: ${fit.missingSkills.join(", ") || "none"}
Missing must-haves: ${fit.missingRequired.join(", ") || "none"}
Explain what drives this score and the single most useful thing to improve it.`,
    model: MODELS.fast,
    maxTokens: 300,
  });
}
