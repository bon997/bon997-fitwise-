-- Job alert settings + subscription plans. Safe to run more than once.
-- Run in Supabase → SQL Editor BEFORE the new code goes live.
-- Alert settings live in users.preferences.alerts (no new table); the first line
-- adds the application deadline shown in alert emails and on jobs.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_deadline timestamptz;

-- Subscription plans (Basic / Pro / Premium) and Stripe billing.
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'premium'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status text;            -- active | trialing | past_due | canceled | manual | …
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_period_end timestamptz;  -- paid until
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
-- Stripe can deliver the same event more than once; each is handled once.
CREATE TABLE IF NOT EXISTS stripe_events (
  id          text PRIMARY KEY,
  type        text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- ── Application tracker: timeline, interview date, next step ──────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS next_step text;
CREATE TABLE IF NOT EXISTS application_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         application_status NOT NULL,
  at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_events_app ON application_events (application_id, at);
CREATE INDEX IF NOT EXISTS application_events_user ON application_events (user_id, status);
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
-- One starting event for applications that existed before the timeline.
INSERT INTO application_events (application_id, user_id, status, at)
SELECT a.id, a.user_id, a.status, coalesce(a.applied_at, a.created_at)
FROM applications a
WHERE NOT EXISTS (SELECT 1 FROM application_events e WHERE e.application_id = a.id);
