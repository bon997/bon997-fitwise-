import Link from "next/link";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { SkillChips } from "./SkillChips";
import { JobActions } from "./JobActions";
import { labels, postedAgo, reasonText } from "@/lib/format";
import { getLocale } from "@/i18n/server";

export type JobCardData = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  employment_type: string | null;
  salary_range: string | null;
  posted_at: Date | string | null;
  fit?: { score: number; matched_skills: string[]; missing_skills: string[]; breakdown?: Record<string, unknown> } | null;
  personal?: { reasons: { text: string; positive: boolean; code?: string; arg?: string }[]; boost: number } | null;
};

export async function JobCard({ job, saved, signedIn }: { job: JobCardData; saved: boolean; signedIn: boolean }) {
  const locale = await getLocale();
  const L = labels(locale);
  const partial = (job.fit?.breakdown?.partial_skills as string[] | undefined) ?? [];
  const meta = [job.location, job.remote && !/remote|distans/i.test(job.location ?? "") ? L.remote : null, job.employment_type ? L.type[job.employment_type] : null]
    .filter(Boolean)
    .join(" · ");
  const reasons = job.personal?.reasons.slice(0, 2) ?? [];

  return (
    <article className="rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-[0_12px_30px_-20px_rgba(21,23,28,0.4)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{job.company}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">
            <Link href={`/jobs/${job.id}`} className="hover:underline hover:underline-offset-4">
              {job.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-ink-2">{meta}</p>
          <p className="mt-0.5 text-sm text-muted">
            {[job.salary_range, postedAgo(job.posted_at, locale)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {job.fit && <FitScoreRing score={job.fit.score} size={64} label={locale === "sv" ? "match" : "fit"} />}
      </div>

      {job.fit && (
        <div className="mt-4">
          <SkillChips matched={job.fit.matched_skills} partial={partial} missing={job.fit.missing_skills} max={6} />
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs">
          {reasons.map((r) => (
            <li key={r.text} className={r.positive ? "text-accent" : "text-warn"}>
              {r.positive ? "↑ " : "↓ "}
              {reasonText(r, locale)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {signedIn ? <JobActions jobId={job.id} saved={saved} compact /> : <span />}
        <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-ink hover:underline hover:underline-offset-4">
          {locale === "sv" ? "Visa och sök →" : "View & apply →"}
        </Link>
      </div>
    </article>
  );
}
