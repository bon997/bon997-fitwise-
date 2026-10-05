# Fitwise — AI job matching platform

Next.js (App Router) + Tailwind CSS v4 + TypeScript. Backend runs as Next.js route handlers (Node runtime), Postgres/Supabase for data, Claude API for AI, Pinecone for semantic search, SerpAPI/RapidAPI for listings.

## Run

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run db:setup             # apply db/schema.sql to $DATABASE_URL
npm run db:seed              # optional sample user + jobs
npm run dev                  # http://localhost:3000
npm test                     # matching engine unit tests
```

Only `DATABASE_URL` is required to run. Without `ANTHROPIC_API_KEY`, AI endpoints return 503; without `PINECONE_API_KEY`, matching runs without the semantic component.

## Build status

| Step | Status |
|---|---|
| 1. Folder structure + project config | ✅ done |
| 2. Landing page | ✅ done |
| 3. Database schema (SQL) | ✅ done |
| 4. Backend API endpoints | ✅ done |
| 5. AI matching engine, resume parser, cover letters | ✅ done |
| 6a. Sign in with Google | ✅ done |
| 6b. Email + password sign-in | later (Google covers most users) |
| 7. Pages: profile, job search, job details + Apply with AI, dashboard | ✅ done |
| 8. Personalization ("For you" ranking) | ✅ done |
| 9. GDPR: data export + account deletion | ✅ done |
| 8. Dashboard + application tracker | next |
| 9. Pricing, FAQ, admin panel | next |

## AI job matching

Claude extracts the structured data. The fit score itself is a deterministic formula (`src/lib/ai/fit-score.ts`), so it is fast, free to recompute, reproducible and unit-tested.

| Component | Weight | How it's computed |
|---|---|---|
| Skills | 45% | Required skills count double. A related skill gets half credit (e.g. PostgreSQL for "SQL"). Aliases are normalized (ReactJS → react). |
| Semantic | 20% | Cosine similarity between the resume and job embeddings in Pinecone, rescaled to 0–1. |
| Experience | 15% | Years vs the job's minimum. A linear penalty applies when short, and a soft one when heavily overqualified. |
| Seniority | 10% | 100 / 70 / 35 / 0 for 0 / 1 / 2 / 3+ levels apart. |
| Location | 10% | Remote jobs, and jobs in a preferred city, score 100. Remote-only users score 0 on onsite jobs. |

A component with no data is dropped and the remaining weights are renormalized, so missing data neither helps nor hurts. Each missing **required** skill caps the score (≤ 88, ≤ 76, …). Scores are cached in `fit_scores` and recompute automatically when the profile or the job changes.

Where Claude is used:
- **Resume parsing** (`parse-resume.ts`): reads PDFs natively and DOCX/TXT as text. It returns skills, experience, years, seniority, suggested roles and resume improvements.
- **Job enrichment at ingest** (`extract-job.ts`, fast model): extracts required vs nice-to-have skills, responsibilities, seniority and minimum years.
- **Cover letters** (`cover-letter.ts`): grounded only in the parsed resume. The prompt forbids invented experience or metrics.
- **Fit explanations**: a 2–3 sentence summary on request, cached with the score.

Resumes and job posts are wrapped in tags and treated as untrusted data in every prompt.

Weekly matches come from Pinecone nearest neighbours plus any recent job that shares a skill. All candidates are scored with the same formula.

## Personalization ("For you")

Each user's ranking adapts to them in two ways:

- **What they tell us** (Profile page): target roles, locations, remote-only, minimum salary.
- **What they do**: applying (strongest signal) and saving pull similar jobs up. "Not interested" asks for a reason, and each reason teaches something different:
  - *not my kind of role*: similar titles drop
  - *hide this company*: every job from that company disappears
  - *wrong location* or *wrong level*: these drop only after two dismissals, so a one-off doesn't count
  - *salary too low*: recorded with the rest

Rules that keep it trustworthy (`src/lib/ai/personalize.ts`):
1. The **fit score never changes** based on taste. It always answers "do you meet this job's requirements?". Personalization is a separate boost of at most ±15 points, giving `for_you = fit + boost`.
2. **Every adjustment has a visible reason** on the job card ("↑ Matches a role you're targeting", "↓ Pays below your minimum salary").
3. **Everything is reversible**: users can undo a dismissal, edit preferences, or save a job they once dismissed.

Ideas for later customization, once there are real users: per-user learned weights (e.g. someone who always applies to remote jobs), "more like this" on any job, and a weekly email digest.

## API reference

Every endpoint returns JSON. Errors look like `{ error }`, and validation errors add `issues`.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/jobs` | optional | Search. Filters: `q, location, remote, type, seniority, salary_min, posted_within, min_fit`. Sort: `relevance\|recent\|fit\|salary`. Paging: `page, per_page`. Includes `fit` when signed in. |
| `GET /api/jobs/:id` | optional | Job details, plus fit, saved and application state. |
| `POST /api/jobs/ingest` | admin or cron | `{ source: serpapi\|rapidapi, query, location?, pages? }` → fetch, upsert, extract skills, embed. |
| `POST /api/resume` | user | multipart `file` (PDF, DOCX or TXT, ≤ 5 MB) → parsed profile, suggested roles, improvements. |
| `GET /api/me` / `PATCH /api/me` | user | Profile. PATCH lets the user fix skills, years, seniority and preferences. |
| `GET /api/match` | user | Weekly matches ranked by fit, plus skill gaps, suggested roles and resume score. |
| `POST /api/fit-score` | user | `{ job_id, explain? }` → score, matched/missing skills, breakdown. |
| `POST /api/cover-letter` | user | `{ job_id, tone?, notes?, save? }` → letter, saved to a draft application. |
| `GET /api/applications` / `POST` | user | Tracker list with per-status counts / create (409 if one already exists). |
| `GET\|PATCH\|DELETE /api/applications/:id` | owner | Status changes set `applied_at` the first time an application leaves draft. |
| `GET\|POST\|DELETE /api/saved-jobs` | user | Bookmarks. |
| `POST\|DELETE /api/jobs/:id/dismiss` | user | "Not interested" `{ reason }` / undo. Feeds personalization. |
| `GET /api/me/export` | user | Download all of the user's data as JSON (GDPR). |
| `DELETE /api/me` | user | `{ confirm: "DELETE" }` permanently deletes the account and resume file (GDPR). |
| `GET /api/admin/stats` | admin | Totals, applications by status, ingestion runs. |

**Auth:** routes read the `fw_session` cookie set at Google sign-in. For API testing in development only, `x-user-id: <uuid>` also works (seed users `…0001` user, `…0002` admin); it's ignored in production.

| Method & path | Purpose |
|---|---|
| `GET /api/auth/google?returnTo=/path` | Redirects to Google's account picker |
| `GET /api/auth/google/callback` | Google returns here; creates or links the user, starts a 30-day session |
| `POST /api/auth/logout` | Ends the session |

## Sign in with Google — setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (any name).
2. Open **Google Auth platform → Branding**. Enter the app name and support email, choose audience **External**, add a contact email, accept the policy, and click **Create**.
3. Open **Audience → Test users → Add users** and add your Gmail address. While the app is in *Testing* mode, only listed test users can sign in.
4. Open **Clients → Create client**, choose **Web application**, and add:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Copy the **Client ID** and **Client secret** into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Set `APP_URL=http://localhost:3000`, and add your Gmail to `ADMIN_EMAILS` to get the admin role.
6. Run `npm run db:setup` (adds the `sessions` table), then `npm run dev`, and open `/login`.

When you deploy, add your real domain's origin and `https://<domain>/api/auth/google/callback` to the same client, set `APP_URL` to it, and publish the app under **Audience** so anyone can sign in.

How it works: authorization-code flow with PKCE and a `state` check. It requests only the `openid email profile` scopes, and the ID token's issuer, audience, expiry and `email_verified` are checked. An existing account with the same email is linked rather than duplicated, and a mismatched Google account is refused. The database stores only a SHA-256 hash of each session token.

## Folder structure

`✅` = exists now. Everything else is the planned layout the next steps fill in.

```
fitwise/
├── .env.example                      ✅ all required keys
├── package.json / tsconfig.json      ✅
├── next.config.ts / postcss.config   ✅
├── db/
│   ├── schema.sql                    ✅ users, jobs, applications, fit_scores, saved_jobs, ingest_runs, sessions, job_dismissals
│   └── seed.sql                      ✅ demo user, admin, 9 jobs
├── tests/                            ✅ 29 tests: scoring, personalization, normalization, source mapping
└── src/
    ├── app/
    │   ├── layout.tsx                ✅ root layout, fonts, metadata
    │   ├── globals.css               ✅ Tailwind v4 theme tokens
    │   ├── page.tsx                  ✅ landing page
    │   ├── (marketing)/
    │   │   ├── pricing/page.tsx
    │   │   └── faq/page.tsx
    │   ├── login/page.tsx            ✅ "Continue with Google"
    │   ├── signup/page.tsx           ✅ same page (Google creates the account)
    │   ├── jobs/
    │   │   ├── page.tsx              ✅ search, filters, "For you" sort, save / not interested
    │   │   └── [id]/page.tsx         ✅ details, fit breakdown, reasons, Apply with AI
    │   ├── dashboard/page.tsx        ✅ weekly matches, profile strength, tracker, skill gaps, saved
    │   ├── profile/page.tsx          ✅ resume upload, skills, preferences, data export / delete
    │   ├── admin/
    │   │   ├── page.tsx              overview metrics
    │   │   ├── users/page.tsx
    │   │   └── jobs/page.tsx         ingestion runs, listing moderation
    │   └── api/                      ✅ all routes below (see API reference)
    │       ├── auth/google/ · auth/google/callback/ · auth/logout/   ✅
    │       ├── jobs/ · jobs/[id]/ · jobs/[id]/dismiss/ · jobs/ingest/
    │       ├── resume/ · me/ · me/export/ · match/ · fit-score/ · cover-letter/
    │       ├── applications/ · applications/[id]/ · saved-jobs/
    │       └── admin/stats/
    ├── components/
    │   ├── ui/                       ✅ FitScoreRing, ButtonLink (+ Input, Badge, Select…)
    │   ├── landing/                  ✅ Navbar, Hero, JobCardPreview, Proof, Sections
    │   ├── app/                      ✅ AppHeader (signed-in navigation)
    │   ├── jobs/                     ✅ JobCard, JobActions (save / not interested), SkillChips, ApplyWithAI
    │   ├── profile/                  ✅ ProfileForm, DataControls (export / delete)
    │   └── dashboard/                ✅ StatusSelect (tracker)
    └── lib/
        ├── marketing-data.ts         ✅ placeholder landing content
        ├── db.ts                     ✅ pg pool (works with Supabase)
        ├── auth.ts                   ✅ requireUser / requireAdmin / getCurrentUser / cron check
        ├── session.ts                ✅ hashed DB sessions, cookie helpers
        ├── google-oauth.ts           ✅ PKCE flow, ID-token checks, user find-or-create
        ├── http.ts                   ✅ error → status mapping, validation helpers
        ├── data.ts                   ✅ row types, public shapes
        ├── matching.ts               ✅ score caching, staleness, recommendations, skill gaps, personal signals
        ├── format.ts                 ✅ labels, relative dates
        ├── job-search.ts             ✅ full-text + filters + fit sort
        ├── ingest.ts                 ✅ fetch → upsert → enrich → embed
        ├── storage.ts                ✅ resume files → Supabase Storage (optional)
        ├── ai/
        │   ├── claude.ts             ✅ client, structured output via forced tool use
        │   ├── skills.ts             ✅ aliases + related-skill partial credit
        │   ├── fit-score.ts          ✅ the scoring formula + resume score
        │   ├── personalize.ts        ✅ "For you" boost with visible reasons
        │   ├── parse-resume.ts       ✅ PDF/DOCX/TXT → profile
        │   ├── extract-job.ts        ✅ posting → skills, seniority, min years
        │   └── cover-letter.ts       ✅ letters + fit explanations
        ├── search/pinecone.ts        ✅ hosted embeddings, upsert, query, per-job similarity
        └── sources/                  ✅ serpapi.ts, rapidapi.ts, shared normalization
```

## Note on landing content

Stats, testimonials and company names in `src/lib/marketing-data.ts` are illustrative placeholders. Replace them with real numbers and quotes before launch.
