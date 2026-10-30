import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { defaultReportMonth, monthKey, monthName, parseMonth, reportRows, reportText, shiftMonth, sourceLabel } from "@/lib/activity-report";
import { labels } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Activity report — Fitwise",
    back: "← Dashboard",
    title: "Activity report",
    intro:
      "If you're registered with Arbetsförmedlingen, you report the jobs you applied for each month, between the 1st and the 14th of the following month. Here are the applications you marked as sent in Fitwise, ready to copy.",
    prev: "← Previous month",
    next: "Next month →",
    count: (n: number) => `${n} application${n === 1 ? "" : "s"}`,
    empty: "No applications sent this month. When you mark a job as applied (or move it past draft), it shows up here.",
    date: "Date",
    job: "Job title",
    employer: "Employer",
    place: "Location",
    adId: "Ad ID",
    source: "Ad found on",
    status: "Status",
    copy: "Copy as text",
    copied: "Copied",
    csv: "Download for Excel",
    how: "How to send it",
    step1: "Sign in at arbetsformedlingen.se and open your activity report (Aktivitetsrapport).",
    step2: "Add each application: job title, employer and date are what they ask for. The Platsbanken ad ID helps when you have it.",
    step3: "Add any applications you sent outside Fitwise yourself; this list only knows about jobs you tracked here.",
    note: "Fitwise isn't connected to Arbetsförmedlingen and never sends anything for you.",
  },
  sv: {
    meta: "Aktivitetsrapport — Fitwise",
    back: "← Översikt",
    title: "Aktivitetsrapport",
    intro:
      "Är du inskriven på Arbetsförmedlingen rapporterar du varje månad vilka jobb du sökt, mellan den 1:a och 14:e månaden efter. Här är ansökningarna du markerat som skickade i Fitwise, redo att kopiera.",
    prev: "← Förra månaden",
    next: "Nästa månad →",
    count: (n: number) => `${n} ${n === 1 ? "ansökan" : "ansökningar"}`,
    empty: "Inga skickade ansökningar den här månaden. När du markerar ett jobb som sökt (eller flyttar det förbi utkast) visas det här.",
    date: "Datum",
    job: "Tjänst",
    employer: "Arbetsgivare",
    place: "Ort",
    adId: "Annons-ID",
    source: "Annonsen fanns på",
    status: "Status",
    copy: "Kopiera som text",
    copied: "Kopierat",
    csv: "Ladda ner för Excel",
    how: "Så skickar du den",
    step1: "Logga in på arbetsformedlingen.se och öppna din aktivitetsrapport.",
    step2: "Lägg till varje ansökan: tjänst, arbetsgivare och datum är det de frågar efter. Platsbankens annons-ID hjälper när det finns.",
    step3: "Lägg själv till ansökningar du skickat utanför Fitwise; listan känner bara till jobb du följt här.",
    note: "Fitwise är inte kopplat till Arbetsförmedlingen och skickar aldrig något åt dig.",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

export default async function ActivityReportPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [user, locale, sp] = await Promise.all([getCurrentUser(), getLocale(), searchParams]);
  if (!user) redirect("/login?returnTo=/activity-report");
  const t = T[locale];
  const month = parseMonth(sp.month) ?? defaultReportMonth();
  const rows = await reportRows(user.id, month);
  const status = labels(locale).status as Record<string, string>;
  const prev = monthKey(shiftMonth(month, -1));
  const next = shiftMonth(month, 1);
  const latest = shiftMonth(defaultReportMonth(), 1);
  const canGoNext = next.year * 12 + next.month <= latest.year * 12 + latest.month;
  const th = "px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted";
  const td = "px-3 py-3 align-top";

  return (
    <>
      <AppHeader user={user} active="/dashboard" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">{t.back}</Link>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">{t.title}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{t.intro}</p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{monthName(month, locale)}</h2>
            <p className="text-sm text-muted">{t.count(rows.length)}</p>
          </div>
          <nav aria-label={t.title} className="flex gap-2 text-sm">
            <Link href={`/activity-report?month=${prev}`} className="rounded-full border border-line px-3 py-2 hover:border-ink/40">{t.prev}</Link>
            {canGoNext && (
              <Link href={`/activity-report?month=${monthKey(next)}`} className="rounded-full border border-line px-3 py-2 hover:border-ink/40">{t.next}</Link>
            )}
          </nav>
        </div>

        {rows.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">{t.empty}</div>
        ) : (
          <>
            {/* Phones: one card per application. */}
            <ul className="mt-5 space-y-3 sm:hidden">
              {rows.map((r, i) => (
                <li key={i} className="rounded-2xl border border-line bg-white p-4 text-sm">
                  <p className="tabular-nums text-xs text-muted">{r.applied_on} · {status[r.status] ?? r.status}</p>
                  <p className="mt-1 font-medium">{r.title}</p>
                  <p className="text-ink-2">{[r.company, r.location].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 text-xs text-muted">{[sourceLabel(r.source), r.ad_id ? `${t.adId} ${r.ad_id}` : null].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
            <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-line bg-white sm:block" role="region" aria-label={monthName(month, locale)} tabIndex={0}>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th scope="col" className={th}>{t.date}</th>
                    <th scope="col" className={th}>{t.job}</th>
                    <th scope="col" className={th}>{t.employer}</th>
                    <th scope="col" className={th}>{t.place}</th>
                    <th scope="col" className={th}>{t.adId}</th>
                    <th scope="col" className={th}>{t.source}</th>
                    <th scope="col" className={th}>{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{r.applied_on}</td>
                      <td className={`${td} font-medium`}>{r.apply_url ? <a href={r.apply_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.title}</a> : r.title}</td>
                      <td className={td}>{r.company}</td>
                      <td className={td}>{r.location ?? "—"}</td>
                      <td className={`${td} tabular-nums`}>{r.ad_id ?? "—"}</td>
                      <td className={td}>{sourceLabel(r.source)}</td>
                      <td className={td}>{status[r.status] ?? r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre id="report-text" className="sr-only">{reportText(rows)}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={reportText(rows)} label={t.copy} done={t.copied} targetId="report-text" />
              <a href={`/api/applications/report?month=${monthKey(month)}`} download className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-2">
                {t.csv}
              </a>
            </div>
          </>
        )}

        <section aria-labelledby="how-heading" className="mt-12 max-w-2xl rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="how-heading" className="text-lg font-semibold">{t.how}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2 marker:text-accent">
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
          <p className="mt-4 text-xs text-muted">{t.note}</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
