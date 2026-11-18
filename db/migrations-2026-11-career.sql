-- Career coach: one plan per user. Safe to run more than once.
CREATE TABLE IF NOT EXISTS career_plans (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_role text,
  horizon     smallint NOT NULL DEFAULT 3,       -- years
  plan        jsonb NOT NULL,
  locale      text NOT NULL DEFAULT 'en',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE career_plans ENABLE ROW LEVEL SECURITY;
