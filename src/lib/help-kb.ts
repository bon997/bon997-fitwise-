import { AI_DAILY_LIMITS, site } from "./site";
import { PRICES_SEK, TRIAL_DAYS, paywallEnabled } from "./plans";

/**
 * What the help assistant knows: how to use JobFitwise, written from what the site really does.
 * Keep it in step with the product (and with src/lib/faq-data.tsx). Plain text on purpose.
 */
export function helpKnowledge(): string {
  const live = paywallEnabled();
  const p = PRICES_SEK;
  const contact = site.contactEmail ? `Email ${site.contactEmail}; we read everything.` : "Use the FAQ page (/faq); a support email is being set up.";
  return `
ABOUT
JobFitwise (www.jobfitwise.se) is an AI job-search assistant for Sweden, focused on logistics, supply chain, procurement, planning, manufacturing, engineering and business roles. It works in Swedish and English (switch SV/EN at the top). It does not apply to jobs for you and is not a recruitment agency.

GETTING STARTED
1. Sign up with email or "Continue with Google" (/signup).
2. Upload your CV on the onboarding steps or on Profile (/profile): PDF, Word (.docx) or text, up to 4 MB. AI reads your skills, experience, education, level and languages.
3. Go to Jobs (/jobs): every job gets a match score 0-100.
If a CV upload fails on a phone: save the file to the phone first (not only in Google Drive/WhatsApp/iCloud), use Wi-Fi, try again.

JOBS AND MATCH SCORE (/jobs)
Jobs come from Platsbanken (Arbetsförmedlingen), Google Jobs and JSearch, imported every night. The match score: skills 40%, experience 30%, education 20%, location 10%. A job page shows matched and missing skills and the one skill that would raise the score most. Sorting: For you, Best match, My priorities, Newest. Save a job with Save.

JOB PAGE TOOLS (/jobs/<id>)
- CV gap analysis: strengths, missing skills and how to close them, CV edits, certifications, ATS keywords.
- Cover letter with AI: a tailored 200-300 word letter in Swedish or English from your CV, optional key achievements and the company's mission/values; plus a recruiter analysis of the top 5 requirements, an ATS keyword check that updates as you edit, and a short Swedish email to the recruiter. You edit it and send it yourself on the employer's site. Up to ${AI_DAILY_LIMITS.cover_letter} letters a day.
- Interview coach (/jobs/<id>/interview): 15-20 likely questions with answers from your CV, STAR examples, questions to ask, a salary tip, and a 5-question practice interview with a readiness score.

APPLICATIONS (/applications)
Track every job: Saved, Applied, Interviewing, Offer, Rejected, Withdrawn. Add interview date, next step, private notes; see a timeline. Statistics: applications sent, interview rate, offer rate, waiting for reply. "Mark as applied" for saved jobs. The activity report for Arbetsförmedlingen is at /activity-report.

JOB ALERTS (Profile → Job alerts)
Email with your best new matches: daily, weekly or monthly; 3, 5, 10 or 20 jobs; categories; city and radius; minimum match. You can write it in one sentence, e.g. "5 logistics jobs in Gothenburg every day", then press Fill in and Save. Every email has a one-click unsubscribe.

CAREER COACH (/career)
Pick a goal role (optional) and 1, 3 or 5 years: get a role path with salary ranges, skills, certifications, open jobs per step and a 30-day plan.

DASHBOARD (/dashboard)
Progress boxes (profile strength, applications sent, interview rate, match strength, interview readiness), your next step, weekly matches.

PLANS AND PRICES (/pricing, /account)
${live
  ? `Basic is free: job search, match scores, CV upload, 10 saved jobs, the application tracker and activity report. Pro: ${p.pro.month} kr/month, ${p.pro.quarter} kr per 3 months or ${p.pro.year} kr per year (full match breakdown, CV gap analysis, job alerts, For you and My priorities sorting, unlimited saves). Premium: ${p.premium.month} kr/month, ${p.premium.quarter} kr per 3 months or ${p.premium.year} kr per year (everything in Pro plus cover letters, interview coach, career coach). Prices include VAT. ${TRIAL_DAYS > 0 ? `New users get a free ${TRIAL_DAYS}-day Pro trial after uploading a CV, no card needed.` : ""} Pay by card via Stripe; change plan, see receipts or cancel any time on Account (/account) → Manage subscription. A cancelled plan stays active until the end of the paid period.`
  : "Everything is free during the beta, for everyone, and no card is asked for. Paid plans (Basic free, Pro, Premium) are prepared; users will be told well in advance before anything changes."}
In the Android app, plans can't be bought.

PRIVACY AND ACCOUNT
Your CV is never shown to employers or sold. Download your data or delete your account on Profile (/profile); deleting removes profile, CV, applications and saved jobs immediately. Privacy policy: /privacy. Terms: /terms.

INSTALL AS AN APP
On Android in Chrome: menu ⋮ → Install app / Add to Home screen. On iPhone in Safari: Share → Add to Home Screen.

CONTACT
${contact} Full FAQ: /faq.
`.trim();
}
