-- AI reports cache (CV gap report per job; interview prep later). Safe to run more than once.
-- Run in Supabase → SQL Editor before this code goes live.
CREATE TABLE IF NOT EXISTS ai_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id      uuid NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  kind        text NOT NULL,                     -- gap
  content     jsonb NOT NULL,
  locale      text NOT NULL DEFAULT 'en',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_reports_unique UNIQUE (user_id, job_id, kind)
);
CREATE INDEX IF NOT EXISTS ai_reports_user_kind ON ai_reports (user_id, kind);
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
