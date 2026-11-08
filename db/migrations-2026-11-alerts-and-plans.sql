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
