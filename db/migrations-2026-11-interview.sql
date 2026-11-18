-- Interview coach: mock interview sessions. Safe to run more than once.
-- (Interview packs are stored in ai_reports with kind = 'interview'.)
CREATE TABLE IF NOT EXISTS interview_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id      uuid NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  questions   jsonb NOT NULL,                    -- [{question, category}]
  turns       jsonb NOT NULL DEFAULT '[]',       -- [{answer, score, feedback, stronger}]
  score       smallint,                          -- readiness 0-100 when done
  summary     jsonb,                             -- {summary, strengths[], improve[]}
  locale      text NOT NULL DEFAULT 'en',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_sessions_user ON interview_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS interview_sessions_job ON interview_sessions (user_id, job_id, created_at DESC);
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
