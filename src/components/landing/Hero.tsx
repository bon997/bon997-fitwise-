import { ButtonLink } from "@/components/ui/ButtonLink";
import { JobCardPreview } from "./JobCardPreview";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-24">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-3 py-1 text-xs text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Scored against 1.2M live listings
        </p>
        <h1 className="mt-6 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Stop guessing.
          <br />
          <em className="text-accent">Know where you fit.</em>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
          Upload your resume once. Fitwise scores every job against your real skills, shows exactly what&apos;s
          missing, and drafts a cover letter for the ones worth your time.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/signup">Upload your resume — free</ButtonLink>
          <ButtonLink href="/jobs" variant="secondary">
            Browse jobs
          </ButtonLink>
        </div>
        <p className="mt-4 text-xs text-muted">No credit card. Your resume stays private.</p>
      </div>
      <div className="md:pl-6">
        <JobCardPreview />
      </div>
    </section>
  );
}
