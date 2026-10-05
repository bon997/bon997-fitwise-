-- Fitwise database schema (PostgreSQL 14+ / Supabase)
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql
-- Re-runnable: everything uses IF NOT EXISTS / OR REPLACE.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email

-- ── Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM
    ('draft', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seniority_level AS ENUM
    ('intern', 'junior', 'mid', 'senior', 'lead', 'executive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Shared trigger: keep updated_at current ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- ── Users ────────────────────────────────────────────────────────────────
-- skills:      ["typescript", "react", ...]                (normalized, lowercase)
-- experience:  [{ title, company, start, end, summary, skills[] }]
-- preferences: { locations[], remote_only, target_titles[], salary_min }
CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text,
  email               citext NOT NULL UNIQUE,
  password_hash       text,                       -- NULL for Google-only accounts
  google_id           text UNIQUE,
  role                user_role NOT NULL DEFAULT 'user',
  resume_url          text,
  resume_text         text,
  skills              jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience          jsonb NOT NULL DEFAULT '[]'::jsonb,
  years_experience    numeric(4,1),
  seniority           seniority_level,
  preferences         jsonb NOT NULL DEFAULT '{}'::jsonb,
  resume_score        smallint CHECK (resume_score BETWEEN 0 AND 100),
  profile_updated_at  timestamptz,               -- bumps when resume/skills change → fit scores go stale
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_skills_is_array     CHECK (jsonb_typeof(skills) = 'array'),
  CONSTRAINT users_experience_is_array CHECK (jsonb_typeof(experience) = 'array')
);
CREATE INDEX IF NOT EXISTS users_skills_gin ON users USING gin (skills);
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Jobs ─────────────────────────────────────────────────────────────────
-- skills: [{ name, required: bool }]  extracted from description/requirements by Claude at ingest
CREATE TABLE IF NOT EXISTS jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  company             text NOT NULL,
  location            text,
  remote              boolean NOT NULL DEFAULT false,
  employment_type     text,                       -- full_time, part_time, contract, internship
  description         text NOT NULL DEFAULT '',
  requirements        text NOT NULL DEFAULT '',
  responsibilities    jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills              jsonb NOT NULL DEFAULT '[]'::jsonb,
  seniority           seniority_level,
  min_years           numeric(4,1),
  salary_range        text,                       -- display string, e.g. "65–78k SEK / mo"
  salary_min          integer,                    -- normalized yearly amount
  salary_max          integer,
  salary_currency     char(3),
  apply_url           text,
  source              text NOT NULL,              -- serpapi | rapidapi | manual
  external_id         text NOT NULL,
  posted_at           timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  embedded_at         timestamptz,                -- last time vector was written to Pinecone
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  search_vector       tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(requirements, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'D')
  ) STORED,
  CONSTRAINT jobs_source_external_unique UNIQUE (source, external_id),
  CONSTRAINT jobs_salary_order CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);
CREATE INDEX IF NOT EXISTS jobs_search_gin   ON jobs USING gin (search_vector);
CREATE INDEX IF NOT EXISTS jobs_skills_gin   ON jobs USING gin (skills jsonb_path_ops);
CREATE INDEX IF NOT EXISTS jobs_active_posted ON jobs (posted_at DESC) WHERE is_active;
CREATE INDEX IF NOT EXISTS jobs_location     ON jobs (lower(location));
DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Applications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        uuid NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  status        application_status NOT NULL DEFAULT 'draft',
  cover_letter  text,
  notes         text,
  applied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_user_job_unique UNIQUE (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS applications_user_status ON applications (user_id, status);
DROP TRIGGER IF EXISTS applications_updated_at ON applications;
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Fit scores (cache of user × job matches) ────────────────────────────
-- breakdown: { skills, experience, seniority, semantic, location } each 0–100
CREATE TABLE IF NOT EXISTS fit_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          uuid NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  score           smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  matched_skills  jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_skills  jsonb NOT NULL DEFAULT '[]'::jsonb,
  breakdown       jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation     text,                           -- optional Claude-written summary
  computed_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fit_scores_user_job_unique UNIQUE (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS fit_scores_user_score ON fit_scores (user_id, score DESC);

-- ── Saved jobs (dashboard bookmarks) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     uuid NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- ── Ingestion log (admin panel) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingest_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,
  query       text NOT NULL,
  fetched     integer NOT NULL DEFAULT 0,
  inserted    integer NOT NULL DEFAULT 0,
  updated     integer NOT NULL DEFAULT 0,
  error       text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- ── Sessions (login) ────────────────────────────────────────────────────
-- The cookie holds a random token; only its SHA-256 hash is stored, so a
-- leaked database dump can't be used to sign in.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_agent  text
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions (expires_at);

-- ── Job feedback (personalization) ──────────────────────────────────────
-- "Not interested" with an optional reason. Together with saved_jobs and
-- applications, these are the signals that tailor each user's ranking.
DO $$ BEGIN
  CREATE TYPE dismiss_reason AS ENUM
    ('not_my_role', 'wrong_location', 'salary_too_low', 'wrong_seniority', 'company', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS job_dismissals (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     uuid NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  reason     dismiss_reason NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
